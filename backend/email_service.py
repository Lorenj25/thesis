"""Email delivery for instructor account verification."""

from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from email.utils import parseaddr

from dotenv import load_dotenv

load_dotenv()


class EmailDeliveryError(RuntimeError):
    """Raised when a verification email cannot be delivered."""


def send_verification_email(email: str, name: str, verification_url: str) -> None:
    host = os.getenv("SMTP_HOST", "").strip()
    sender = os.getenv("SMTP_FROM_EMAIL", "").strip()
    if not host or not sender or not parseaddr(sender)[1]:
        raise EmailDeliveryError(
            "Account created, but confirmation email could not be sent. "
            "Configure SMTP_HOST and SMTP_FROM_EMAIL, then resend the email."
        )

    try:
        port = int(os.getenv("SMTP_PORT", "587"))
        timeout = float(os.getenv("SMTP_TIMEOUT_SECONDS", "15"))
        username = os.getenv("SMTP_USERNAME", "").strip()
        password = os.getenv("SMTP_PASSWORD", "")
        use_ssl = os.getenv("SMTP_USE_SSL", "false").strip().lower() == "true"
        use_starttls = os.getenv("SMTP_STARTTLS", "true").strip().lower() == "true"
        if not 1 <= port <= 65535 or timeout <= 0:
            raise ValueError("Invalid SMTP port or timeout.")
        if bool(username) != bool(password):
            raise ValueError("SMTP_USERNAME and SMTP_PASSWORD must be configured together.")

        message = EmailMessage()
        message["Subject"] = "Confirm your CodeAuthentic instructor account"
        message["From"] = sender
        message["To"] = email
        message.set_content(
            f"Hello {name},\n\n"
            "Confirm your instructor account by opening this link:\n"
            f"{verification_url}\n\n"
            "This link expires in 24 hours. If you did not create this account, "
            "you can ignore this message."
        )

        smtp_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        with smtp_class(host, port, timeout=timeout) as smtp:
            if not use_ssl and use_starttls:
                smtp.starttls()
            if username:
                smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, ValueError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError(
            "Account created, but confirmation email could not be sent. "
            "Check the SMTP settings, then resend the email."
        ) from exc
