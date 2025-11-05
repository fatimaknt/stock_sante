<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class BackupDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:backup {--keep=7 : Number of backups to keep}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a backup of the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $connection = DB::getDefaultConnection();
        $driver = config("database.connections.{$connection}.driver");

        try {
            if ($driver === 'sqlite') {
                $this->backupSqlite($connection);
            } elseif ($driver === 'mysql') {
                $this->backupMysql($connection);
            } else {
                $this->error("Le driver de base de données '{$driver}' n'est pas supporté pour le backup.");
                return 1;
            }

            $this->cleanOldBackups();
            $this->info('Backup créé avec succès !');
            return 0;
        } catch (\Exception $e) {
            $this->error('Erreur lors de la création du backup: ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Backup SQLite database
     */
    protected function backupSqlite($connection)
    {
        $databasePath = config("database.connections.{$connection}.database");

        if (!file_exists($databasePath)) {
            throw new \Exception("Le fichier de base de données n'existe pas: {$databasePath}");
        }

        $backupDir = storage_path('app/backups');
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $timestamp = Carbon::now()->format('Y-m-d_His');
        $backupFileName = "database_backup_{$timestamp}.sqlite";
        $backupPath = $backupDir . '/' . $backupFileName;

        if (copy($databasePath, $backupPath)) {
            $this->info("Backup SQLite créé: {$backupFileName}");
        } else {
            throw new \Exception("Impossible de copier le fichier de base de données");
        }
    }

    /**
     * Backup MySQL database
     */
    protected function backupMysql($connection)
    {
        $config = config("database.connections.{$connection}");

        $backupDir = storage_path('app/backups');
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $timestamp = Carbon::now()->format('Y-m-d_His');
        $backupFileName = "database_backup_{$timestamp}.sql";
        $backupPath = $backupDir . '/' . $backupFileName;

        $host = $config['host'];
        $port = $config['port'] ?? 3306;
        $database = $config['database'];
        $username = $config['username'];
        $password = $config['password'];

        // Créer la commande mysqldump
        $command = sprintf(
            'mysqldump --host=%s --port=%s --user=%s --password=%s %s > %s 2>&1',
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($username),
            escapeshellarg($password),
            escapeshellarg($database),
            escapeshellarg($backupPath)
        );

        exec($command, $output, $returnVar);

        if ($returnVar !== 0 || !file_exists($backupPath)) {
            throw new \Exception("Erreur lors de la création du dump MySQL: " . implode("\n", $output));
        }

        $this->info("Backup MySQL créé: {$backupFileName}");
    }

    /**
     * Clean old backups, keeping only the specified number
     */
    protected function cleanOldBackups()
    {
        $keep = (int) $this->option('keep');
        $backupDir = storage_path('app/backups');

        if (!is_dir($backupDir)) {
            return;
        }

        $files = glob($backupDir . '/database_backup_*');

        if (count($files) <= $keep) {
            return;
        }

        // Trier par date de modification (les plus anciens en premier)
        usort($files, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });

        // Supprimer les anciens backups
        $filesToDelete = array_slice($files, 0, count($files) - $keep);
        foreach ($filesToDelete as $file) {
            unlink($file);
            $this->info("Ancien backup supprimé: " . basename($file));
        }
    }
}

