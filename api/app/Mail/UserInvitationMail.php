<?php

namespace App\Mail;

use App\Models\UserInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public UserInvitation $invitation
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invitation à rejoindre StockPro',
        );
    }

    public function content(): Content
    {
        $activationUrl = env('FRONTEND_URL', 'http://localhost:3000') . '/auth/activate?token=' . $this->invitation->token;

        return new Content(
            view: 'emails.user-invitation',
            with: [
                'invitation' => $this->invitation,
                'activationUrl' => $activationUrl,
                'expiresAt' => $this->invitation->expires_at->format('d/m/Y à H:i'),
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

