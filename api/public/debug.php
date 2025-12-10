<?php
// Error capture script for debugging
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');






























require __DIR__ . '/index.php';// Now load the actual index});    file_put_contents(__DIR__ . '/../storage/logs/php-errors.log', $message . PHP_EOL, FILE_APPEND);    );        $exception->getTraceAsString()        $exception->getLine(),        $exception->getFile(),        $exception->getMessage(),        date('Y-m-d H:i:s'),        "[%s] Exception: %s in %s:%d\nStacktrace:\n%s",    $message = sprintf(set_exception_handler(function($exception) {});    return false;    file_put_contents(__DIR__ . '/../storage/logs/php-errors.log', $message . PHP_EOL, FILE_APPEND);    );        $errline        $errfile,        $errstr,        date('Y-m-d H:i:s'),        "[%s] %s in %s:%d",    $message = sprintf(set_error_handler(function($errno, $errstr, $errfile, $errline) {// Capture any errors before Laravel bootstrapini_set('error_log', __DIR__ . '/../storage/logs/php-errors.log');
