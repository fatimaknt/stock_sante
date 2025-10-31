<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation StockPro</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }

        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #10b981;
            margin: 0;
            font-size: 28px;
        }

        .content {
            margin-bottom: 30px;
        }

        .content p {
            margin-bottom: 15px;
        }

        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #10b981;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }

        .button:hover {
            background-color: #059669;
        }

        .info-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }

        .info-box h3 {
            margin-top: 0;
            color: #1e40af;
        }

        .info-box ul {
            margin: 10px 0;
            padding-left: 20px;
        }

        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }

        .expiry-note {
            color: #dc2626;
            font-weight: 600;
            margin-top: 15px;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>StockPro</h1>
        </div>

        <div class="content">
            <p>Bonjour {{ $invitation->name }},</p>

            <p>Vous avez été invité(e) à rejoindre <strong>StockPro</strong>, la plateforme de gestion de stock.</p>

            <p>Votre compte a été créé avec le rôle : <strong>{{ $invitation->role }}</strong></p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $activationUrl }}" class="button">Activer mon compte</a>
            </div>

            <p>Ou copiez-collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: #3b82f6;">{{ $activationUrl }}</p>

            <div class="info-box">
                <h3>📋 Processus d'invitation</h3>
                <ul>
                    <li>Un email vous a été envoyé avec un lien d'activation</li>
                    <li>Le lien est valide <strong>24 heures</strong></li>
                    <li>Vous devrez définir votre mot de passe lors de l'activation</li>
                </ul>
            </div>

            <p class="expiry-note">
                ⚠️ Ce lien expirera le {{ $expiresAt }}
            </p>
        </div>

        <div class="footer">
            <p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
            <p>&copy; {{ date('Y') }} StockPro. Tous droits réservés.</p>
        </div>
    </div>
</body>

</html>
