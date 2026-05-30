import os
import smtplib
from email.message import EmailMessage
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


class EmailClientError(Exception):
    pass


class SMTPEmailClient:
    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        email_from: Optional[str] = None,
    ):
        self.host = host or os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.port = int(port or os.getenv("SMTP_PORT", "587"))
        self.username = username or os.getenv("SMTP_USERNAME")
        self.password = password or os.getenv("SMTP_PASSWORD")
        self.email_from = email_from or os.getenv("EMAIL_FROM") or self.username

        if not self.username:
            raise EmailClientError("Missing SMTP_USERNAME in .env")

        if not self.password:
            raise EmailClientError("Missing SMTP_PASSWORD in .env")

        if not self.email_from:
            raise EmailClientError("Missing EMAIL_FROM in .env")

    def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
    ) -> dict:
        msg = EmailMessage()
        msg["From"] = self.email_from
        msg["To"] = to
        msg["Subject"] = subject

        msg.set_content(body)

        if html:
            msg.add_alternative(html, subtype="html")

        try:
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)

            return {
                "status": "ok",
                "provider": "smtp",
                "to": to,
                "subject": subject,
            }

        except Exception as e:
            raise EmailClientError(str(e)) from e