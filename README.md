# Amina M Rafeek & Dr. Muhammed Rinshad — wedding invitation

This is a self-contained website. The supplied video is used as a visual reference: the invitation uses overlapping portrait prints, a sage arch panel, and a paper-style guestbook. The page glides to the scratch card, pauses for the guest, then continues to the guestbook after the date is revealed. Guests can stop the glide or take manual control at any time. The newer portraits appear in the cover, opening section, and couple portrait section.

To preview the complete guestbook locally, use Python 3.10 or newer and run `python3 server.py` from this folder, then open `http://localhost:4173`. The included server serves the site and saves greetings in `data/greetings.json`. All guests visiting that running server see the same greetings. For public hosting, use a Python host with a persistent disk attached to this folder; otherwise greetings may be lost when the host restarts or redeploys. No third-party database account is needed.

## Edit the invitation

Update `js/wedding.js` to change the names, date and local time, venue, Google Maps link, photos, or music file. Keep the date in ISO format and include the local UTC offset so the countdown stays accurate wherever guests open the page. Update `fullDate`, `shortDate`, `weekday`, `dayNumber`, and `monthYear` to match the date. Replace the image or audio files in `assets/`, or change their paths in the same configuration file.

The invitation copy, captions, and layout are in `index.html`; colors, type, spacing, and motion are in `css/styles.css`. The browser title and page description follow the names and details in `js/wedding.js`.

## Sharing preview

The page includes Open Graph and Twitter preview metadata. Social crawlers read the static tags in `index.html`, so after changing the wedding details, update `og:title` and `og:description` there too. After publishing, set `og:image` to the full public URL of the chosen photo (for example, `https://your-domain.example/assets/amina-garden.jpeg`) and add an `og:url` value for the published page. Set `publicUrl` in `js/wedding.js` to the same page URL so the share button sends the public link.

The included Google Fonts load when guests have an internet connection; the page has serif and sans-serif fallbacks. The photos and music are local assets. Guest messages are public and use basic length, honeypot, and rate-limit protections; the server does not collect email addresses.
