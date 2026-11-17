# Security policy

NotBitLee handles sign-ins and redirects for other people's domains, so we take security reports seriously.

## Reporting a vulnerability

**Please don't open a public issue.** Use GitHub's private reporting instead:

1. Go to the **Security** tab of this repository.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it, and what an attacker could do with it.

We aim to reply within 5 working days. Once a fix is ready we'll publish it with a security advisory and credit you, unless you'd rather stay anonymous.

## Supported versions

Security fixes go into the latest release only. Because each deployment is a copy in its owner's GitHub account, **you need to pull updates into your copy** to receive fixes. See "Updating" in the README.

## Things that help keep your deployment safe

- Use a long, unique `ADMIN_PASSWORD`, and change it in the Worker's secrets if it might have leaked.
- Only add teammates who need access, and remove people when they leave.
- Keep your copy up to date.
