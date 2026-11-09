# STREAK Pilot Hardware BOM

**Market:** India  
**Deployment:** Single-gym pilot  
**Display target:** 32-inch 1080p  
**Viewing distance:** Approximately 2–4 metres  
**Connectivity:** Ethernet preferred; Wi-Fi fallback  

## Base hardware

| Item | Minimum specification | Qty | Estimated unit cost | Estimated subtotal |
|---|---|---:|---:|---:|
| Display | 32-inch, 1920×1080, HDMI, VESA mount, HDMI-CEC or auto-input recovery | 1 | ₹9,000–₹16,000 | ₹9,000–₹16,000 |
| Media/gateway | Raspberry Pi 4, 4 GB RAM, active cooling, official PSU | 1 | ₹4,500–₹5,800 | ₹4,500–₹5,800 |
| Storage | 32 GB high-endurance microSD card | 1 | ₹500–₹1,000 | ₹500–₹1,000 |
| RFID reader | USB keyboard-emulation, EM4100-compatible, 125 kHz | 1 | ₹400–₹600 | ₹400–₹600 |
| Keyfobs | EM4100-compatible, 125 kHz | 50 | ₹20–₹40 | ₹1,000–₹2,000 |
| UPS | 600–650 VA line-interactive UPS | 1 | ₹2,100–₹3,600 | ₹2,100–₹3,600 |
| TV wall mount | Fixed VESA mount rated above selected TV weight | 1 | ₹400–₹1,200 | ₹400–₹1,200 |
| HDMI cable | 1.5–3 metre | 1 | ₹150–₹500 | ₹150–₹500 |
| Surge protection | Surge strip with overload protection | 1 | ₹500–₹1,000 | ₹500–₹1,000 |
| Cable management | Cable duct, ties, labels, clips | 1 lot | ₹350–₹1,000 | ₹350–₹1,000 |
| Ethernet cable | Cat6, 10–15 metre | 1 | ₹300–₹800 | ₹300–₹800 |

**Estimated base hardware total:** **₹19,200–₹33,500**

## Recommended spares

| Item | Qty | Estimated cost |
|---|---:|---:|
| Spare USB RFID reader | 1 | ₹400–₹600 |
| Spare keyfobs | 10 | ₹200–₹400 |
| Spare Raspberry Pi power adapter | 1 | ₹500–₹1,000 |
| Spare HDMI cable | 1 | ₹150–₹500 |

**Recommended spare allowance:** **₹1,250–₹2,500**

## Installation allowance

| Work | Estimated cost |
|---|---:|
| TV wall mounting and anchors | ₹800–₹2,000 |
| Cable routing and finishing | ₹500–₹1,500 |
| Gateway/kiosk setup | ₹500–₹1,500 |
| Reader placement, keyfob enrollment, and test taps | ₹700–₹1,000 |

**Estimated installation allowance:** **₹2,500–₹6,000**

## Total pilot estimate

| Category | Estimated cost |
|---|---:|
| Base hardware | ₹19,200–₹33,500 |
| Recommended spares | ₹1,250–₹2,500 |
| Installation | ₹2,500–₹6,000 |

**Estimated installed pilot total:** **₹22,950–₹42,000**, excluding GST and shipping.

## Optional items

| Item | When to add | Estimated cost |
|---|---|---:|
| Intel N100 mini PC | Raspberry Pi availability or kiosk reliability is poor | ₹12,000–₹19,000 |
| 4G USB modem and SIM | No reliable gym Wi-Fi/Ethernet or backup connectivity required | ₹2,000–₹5,000 |
| Monthly 4G data | Cellular connectivity | ₹700–₹1,500/month |
| External speaker | TV speakers are inadequate | ₹1,000–₹3,000 |
| 43-inch display | Site survey shows group viewing requires a larger screen | Usually ₹22,000–₹65,000 for available 4K models |

## Site and procurement checks

- Confirm the selected TV supports automatic power recovery and returns to the HDMI input after power restoration.
- Confirm a suitable wall surface, VESA pattern, outlet location, and cable route.
- Prefer Ethernet; verify Wi-Fi signal strength if Ethernet is unavailable.
- Confirm the USB RFID reader emits a keyboard-compatible ID terminated by a newline or carriage return.
- Use 125 kHz EM4100 keyfobs only for attendance recognition, not door access or high-security identity verification.
- Keep the gateway and reader physically accessible for service, but do not expose credentials.
- Include UPS coverage for the gateway and network equipment; the TV does not need UPS coverage for the base pilot.

## BOM decision

The approved pilot baseline is the **32-inch 1080p Linux kit** with a Raspberry Pi gateway, USB 125 kHz reader, 50 keyfobs, UPS, wall mount, Ethernet/Wi-Fi support, and a small spare pack. 
