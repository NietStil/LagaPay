<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** The link to the WachtwoordVeranderen page, sent from the Wachtwoord vergeten page. */
class WachtwoordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $link,
        public ?string $naam,
        public bool $heeftWachtwoord,
        public int $minutenGeldig,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->heeftWachtwoord ? 'Wachtwoord herstellen' : 'Wachtwoord instellen',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.wachtwoord-reset',
        );
    }
}
