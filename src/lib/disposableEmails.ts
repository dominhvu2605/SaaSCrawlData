// Common disposable/temporary email domains to block
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.biz", "guerrillamail.de", "guerrillamail.info", "guerrillamailblock.com",
  "grr.la", "sharklasers.com", "spam4.me", "trashmail.com", "trashmail.me",
  "trashmail.at", "trashmail.io", "trashmail.net", "dispostable.com", "yopmail.com",
  "yopmail.fr", "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx",
  "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf",
  "monmail.fr.nf", "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "10minutemail.co.uk", "10minutemail.de", "10minutemail.us", "10minutemail.info",
  "10minutesmail.com", "throwam.com", "throwam.net", "throwam.info", "mailnull.com",
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org", "tempr.email", "discard.email",
  "tempinbox.com", "spamfree24.org", "spamfree24.de", "spamfree24.net", "spamfree24.info",
  "spamfree.eu", "spamfree24.com", "maildrop.cc", "mailnesia.com", "mailnull.com",
  "tempmail.com", "tempmail.net", "tempmail.org", "getairmail.com", "filzmail.com",
  "throwam.com", "throwam.net", "throwam.info", "temporarymail.com", "throwaway.email",
  "fakeinbox.com", "fakeinbox.net", "spambog.com", "spambog.de", "spambog.ru",
  "spambox.us", "spambox.info", "spambox.org", "spambox.net", "spam.la",
  "tempinbox.co.uk", "tempinbox.com", "spamkill.info", "spamcon.org", "spamgap.com",
  "tempsky.com", "mailtemp.info", "tempomail.fr", "temporaryinbox.com", "emailondeck.com",
  "dropmail.me", "mohmal.com", "dispostable.com", "getnada.com", "nada.email",
  "sharklasers.com", "guerrillamail.info", "grr.la", "guerrillamail.biz",
  "inboxclean.org", "inboxclean.com", "mailscrap.com", "throwam.com", "owlpic.com",
  "discard.email", "spambog.com", "vomoto.com", "ieatspam.eu", "ieatspam.info",
  "mailseal.de", "kurzepost.de", "objectmail.com", "proxymail.eu", "rcpt.at",
  "trash-mail.at", "trashmail.at", "trashmail.io", "trashmail.me", "trashmail.net",
  "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org", "mailboxy.fun",
  "tempmail.ninja", "zetmail.com", "dispostable.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true;
  return DISPOSABLE_DOMAINS.has(domain);
}

// Basic email format validation
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}
