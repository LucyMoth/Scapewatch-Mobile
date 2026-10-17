/* Original Credits entries and popup DOM from the public Scapewatch client. */
(function () {
  'use strict';
  const Credits = {
    ENTRIES: [
      {
        title: 'Design, code, writing',
        body: 'Puzzle Drop Studios (solo developer)',
        links: [
          {
            label: 'Steam page',
            url: 'https://store.steampowered.com/app/4671380/Scapewatch_Idle_MMO/',
          },
          { label: 'Discord', url: 'https://discord.gg/rBuXwzbzHn' },
          { label: 'Press kit', url: 'https://scapewatch.com/presskit/' },
        ],
      },
      {
        title: 'Map',
        body: 'Made with Inkarnate',
        links: [{ label: 'inkarnate.com', url: 'https://inkarnate.com' }],
      },
      { title: 'Map maker', body: 'FenixSolos' },
      { title: 'Map touchups', body: 'Puzzle Drop' },
      {
        title: 'Capsule art',
        body: 'Handdrawn by Alan Brodecki',
        links: [
          {
            label: 'artstation.com/alanbrodecki',
            url: 'https://www.artstation.com/alanbrodecki',
          },
        ],
      },
      {
        title: 'Pixel art',
        body: 'soda',
        links: [{ label: 'soda-1.itch.io', url: 'https://soda-1.itch.io/' }],
      },
      {
        title: 'Character sprites (LPC)',
        body: 'Liberated Pixel Cup (LPC) Universal Character Generator. Sprites contributed by many artists as part of the LPC project on OpenGameArt.org. Licensed under CC-BY-SA 3.0, CC-BY 4.0, OGA-BY 3.0, and GPL 3.0 (varies per asset).',
        links: [
          {
            label: 'LPC collection',
            url: 'https://opengameart.org/content/lpc-collection',
          },
          {
            label: 'CC-BY-SA 3.0 license',
            url: 'https://creativecommons.org/licenses/by-sa/3.0/',
          },
          {
            label: 'Per-file CREDITS.csv',
            url: '/assets/players/LPC/CREDITS.csv',
          },
        ],
      },
      {
        title: 'Additional pixel art',
        body: 'Stock assets from Craftpix',
        links: [{ label: 'craftpix.net', url: 'https://craftpix.net' }],
      },
      {
        title: 'Sounds',
        body: 'Sound effects by Kenney (CC0)',
        links: [{ label: 'kenney.nl', url: 'https://kenney.nl' }],
      },
      {
        title: 'Music',
        body: 'Music by AlkaKrab',
        links: [
          {
            label: 'alkakrab.itch.io',
            url: 'https://alkakrab.itch.io/free-fantasy-medieval-ambient-music-pack',
          },
        ],
      },
      {
        title: 'No AI',
        body: 'No AI was used to make any of the art in game or in promotional content or anywhere else. All art is paid for by me to real, breathing human artists.',
      },
    ],
    showPopup() {
      document.querySelector('.cc-credits-overlay')?.remove();
      const overlay = create('cc-credits-overlay');
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) overlay.remove();
      });
      const dialog = create('cc-credits-dialog');
      const header = create('cc-credits-header');
      const close = create('cc-credits-close', '✕');
      close.addEventListener('click', () => overlay.remove());
      header.append(create('cc-credits-title', 'Credits'), close);
      const body = create('cc-credits-body settings-credits-list');
      Credits.buildBlock(body);
      dialog.append(header, body);
      overlay.append(dialog);
      (document.getElementById('ui-container') || document.body).append(overlay);
      function dismiss(event) {
        if (event.key !== 'Escape') return;
        if (!document.body.contains(overlay)) {
          document.removeEventListener('keydown', dismiss, true);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        document.removeEventListener('keydown', dismiss, true);
        overlay.remove();
      }
      document.addEventListener('keydown', dismiss, true);
    },
    buildBlock(container) {
      if (!container) return;
      for (const entry of this.ENTRIES) {
        const element = create('credits-entry');
        element.append(create('credits-title', entry.title), create('credits-body', entry.body));
        if (entry.links?.length) {
          const links = create('credits-links');
          for (const entryLink of entry.links) {
            const link = create('credits-link', entryLink.label, 'a');
            link.href = entryLink.url;
            link.target = '_blank';
            link.rel = 'noopener';
            links.append(link);
          }
          element.append(links);
        }
        container.append(element);
      }
    },
  };
  function create(className, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = className;
    if (text) element.textContent = text;
    return element;
  }
  window.Credits = Credits;
})();
