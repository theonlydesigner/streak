# STREAK Pilot Hardware Design

**Date:** 2026-11-01

## Intent

STREAK needs a low-cost, repeatable entrance kit for a single-gym pilot in India. When a member taps a newly issued credential, the kit must send the attendance event to STRK Cloud and show the resulting recognition experience on a wall-mounted display.

The pilot prioritizes minimum practical cost over commercial-signage polish. The display is for large text, streak numbers, leaderboard rows, and flame graphics; it is not a video playback system. The first pilot does not need to preserve the gym’s current manual check-in process because STREAK will issue and read its own credentials.

## Goals

- Provide one working entrance kit for a 2–4 metre viewing distance.
- Show the STREAK welcome card and idle leaderboard on a 32-inch 1080p display.
- Read 125 kHz EM4100-compatible keyfobs through a USB reader.
- Keep the media player and reader on UPS-backed power.
- Support Ethernet when available and Wi-Fi otherwise.
- Include enough spares to recover from one reader, power-adapter, or cable failure.
- Keep the installed pilot target near ₹24,000–₹43,000, excluding GST/shipping and optional cellular connectivity.

## Non-goals

- Replacing or integrating with the gym’s existing access-control system.
- Using the STREAK credential as a door-access credential.
- Supporting 4K rendering in the pilot.
- Building custom scanner electronics or a custom media-player enclosure.
- Providing cellular connectivity in the base kit.
- Selecting a final production security credential standard.

## Anti-goals

- Do not use the 125 kHz credential as a high-security identity proof or access-control mechanism; EM4100 credentials are clonable.
- Do not buy a 43-inch 4K display merely for resolution when the pilot UI is text and graphics.
- Do not depend on an unbranded Android TV box for the pilot’s kiosk reliability unless the Linux gateway path is unavailable.
- Do not place the RFID reader behind the display or in a position that makes tapping ambiguous.

## Locked baseline BOM

| Component | Minimum specification | Quantity | Target India price |
|---|---|---:|---:|
| Display | 32-inch, native 1920×1080, HDMI, VESA mount, HDMI-CEC or documented auto-input recovery | 1 | ₹9,000–₹16,000 |
| Media/gateway | Raspberry Pi 4, 4 GB RAM, 32 GB high-endurance microSD, active-cooling case, official power supply | 1 | ₹5,500–₹8,000 |
| RFID reader | USB keyboard-emulation, EM4100-compatible, 125 kHz, approximately 1.5 m cable | 1 | ₹400–₹600 |
| Keyfobs | EM4100-compatible 125 kHz | 50 | ₹1,000–₹2,000 |
| Power backup | 600–650 VA line-interactive UPS for gateway, reader, and router | 1 | ₹2,100–₹3,600 |
| Mounting | Fixed VESA wall mount rated above the selected TV weight | 1 | ₹400–₹1,200 |
| Cabling/protection | HDMI cable, surge strip, cable duct/ties, labels | 1 lot | ₹1,000–₹2,000 |
| Network fallback | 10–15 m Cat6 cable; Wi-Fi remains available when Ethernet is absent | 1 | ₹300–₹800 |

The target hardware total is ₹19,700–₹34,200. The recommended spare pack is one additional reader, 10 additional keyfobs, one replacement power supply, and one replacement HDMI cable, budgeted at ₹1,500–₹3,000. Installation includes wall mounting, cabling, kiosk configuration, reader enrollment, and test check-ins, budgeted at ₹2,500–₹6,000. The installed pilot target is approximately ₹24,000–₹43,000, excluding GST/shipping and optional 4G connectivity.

## Acceptable substitutions

- Replace the Raspberry Pi with an Intel N100 mini PC with at least 8 GB RAM and a 256 GB SSD when Pi availability, support, or kiosk reliability is unacceptable; target price is approximately ₹12,000–₹19,000.
- Replace the 32-inch display with a 43-inch display only after a site survey shows that the entrance needs larger group readability. New 43-inch Full HD models are uncommon, so a 43-inch 4K model is an optional size upgrade, not the baseline.
- An Android TV box may be used for a temporary demo, but it is not the preferred pilot gateway because background process killing and kiosk restart behavior are less controllable.

## Installation and operating assumptions

- The gateway and RFID reader are installed near the entrance, while the display is mounted at eye level and visible from the member approach path.
- The gateway uses wired Ethernet when a nearby network point exists and otherwise uses the gym’s Wi-Fi.
- The gym supplies mains power and an internet connection in the installation area.
- The TV’s built-in speakers provide the welcome audio; an external speaker is not part of the pilot BOM.
- The display should recover to the STREAK kiosk after power restoration. The installer must verify HDMI-CEC or the selected TV’s documented input-recovery behavior before final mounting.
- The cloud service owns member enrollment, event validation, streak calculation, and display updates. The gateway owns only credential reading, HTTPS delivery, kiosk startup, and local reconnect behavior.

## Approaches considered

### Lowest-cost Linux pilot — selected

Use a 32-inch 1080p TV, Raspberry Pi gateway, USB EM4100 reader, Wi-Fi/Ethernet, and UPS. This best matches the cost-sensitive pilot objective while retaining control over kiosk startup and the local scanner process.

### Commercial-signage pilot — not selected

Use a commercial 43-inch signage panel, branded mini PC, industrial reader, and wired Ethernet. This improves duty-cycle, warranty, and installation confidence but adds cost before the product’s retention value is validated.

### Android TV pilot — not selected

Use an Android TV and USB reader. This has the lowest initial friction but gives weaker control over process supervision, kiosk lockdown, browser recovery, and background power behavior.

## Open implementation decisions

- The installer must confirm the selected TV model’s auto-power/input-recovery behavior.
- The installer must choose Ethernet or Wi-Fi after a site survey.
- The software implementation must treat the USB reader as keyboard-emulation input and support a configurable reader suffix/terminator if the selected device emits one.
- A production credential standard, commercial display tier, and optional cellular backup require a separate validation after the pilot.
