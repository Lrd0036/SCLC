# Attack Walkthrough — Presenter Script

> **Usage:** This is your narration guide. The left column tracks what the audience *sees* on screen. The right column is what you *say*. Advance stages with **Spacebar** or **→**. Go back with **←**.

---

## STAGE 0 — NORMAL OPERATIONS

**On Screen:** Full map of Northern Virginia — Loudoun, Fairfax, Prince William counties. Blue infrastructure nodes glowing steadily. Cyan data center dots pulsing. Everything looks healthy.

**You Say:**

> "What you're looking at is a simplified map of Royal Duke Infrastructure Group's operational territory across Northern Virginia. The blue nodes are their critical assets — substations, their headquarters and energy management system, and a water treatment facility. The small cyan dots represent the three major data center campuses they supply: Ashburn, Manassas, and Tysons.
>
> Right now, everything is running normally. Over 4,100 megawatts of server capacity is humming along. Let's see what happens when an attacker finds an open window."

*Press SPACE to advance.*

---

## STAGE 1 — THE OPEN WINDOW

**On Screen (Map):** Camera zooms in toward the vendor portal and Royal Duke HQ. A red attack trace animates from the vendor portal into HQ. Both nodes turn red.

**On Screen (Terminal):** Attacker runs `hydra` to brute-force the VPN, gets credentials, SSHs into the domain controller, runs `whoami`, `ifconfig`, `net view`, then installs a C2 beacon.

**You Say:**

> "The attacker starts where most real-world breaches start — with a third-party vendor portal. Using a tool called Hydra, they brute-force the VPN login. The password? 'Duke2024.' This isn't hypothetical — 81% of breaches involve weak or stolen credentials according to Verizon's DBIR.
>
> Once inside, they SSH into the domain controller — RDIG-DC01. You can see them running basic reconnaissance: `whoami` to confirm they're an admin, `ifconfig` to see the network layout, and `net view` to enumerate every server on the domain. They immediately find the SCADA server, the HMI workstation, the data historian, and the engineering workstation — all visible from the IT network.
>
> Then they install persistence — a command-and-control beacon that calls home every 60 seconds. Even if someone changes the VPN password now, the attacker is already inside."

---

## STAGE 2 — THE PIVOT

**On Screen (Map):** Camera centers on HQ. A red ring expands outward from HQ — the attacker scanning the OT network. The IT/OT boundary line appears, labeled 'BREACHED.'

**On Screen (Terminal):** Attacker checks route tables, finds the OT subnet (10.20.0.0/24) is directly routable. Runs a full `nmap` scan targeting Modbus (502), S7comm (102), and EtherNet/IP (44818). Discovers 3 PLCs. Fingerprints them — Schneider Modicon M340 and Allen-Bradley ControlLogix, both running outdated firmware, both accepting unauthenticated remote writes.

**You Say:**

> "This is where it gets dangerous. The attacker checks the route table and discovers something critical — the OT network, where the industrial equipment lives, is directly reachable from the IT network. There's no firewall, no segmentation, no DMZ. One flat network.
>
> They run nmap — a network scanner — targeting port 502, which is the Modbus protocol used by industrial control systems. Think of it as calling every phone extension in a building to see who picks up.
>
> Three devices answer. Schneider Modicon M340 PLCs at both substations and an Allen-Bradley ControlLogix at the water treatment plant. The scan reveals two critical findings: the firmware is outdated by multiple versions, and — most importantly — all three PLCs accept unauthenticated remote commands. Anyone who can reach them can write to them. No password. No certificate. Nothing."

---

## STAGE 3 — THE ILLUSION

**On Screen (Map):** Camera zooms tight on the Royal Duke HQ node. The node flickers between green (what operators see) and red (reality). Periodic glitch frames flash red.

**On Screen (Terminal):** Attacker displays and runs `hmi_spoof.py` — a Python script using `pymodbus`. Reads the real pressure (72 PSI), writes 75 PSI to the HMI override register, locks the HMI refresh. A box shows the split: operator sees "75 PSI — NORMAL" while reality is "climbing."

**You Say:**

> "This is where the attacker becomes invisible. Before they do any physical damage, they need to make sure nobody's watching.
>
> What you're seeing on the right is a Python script targeting the Modbus holding registers on that PLC. The attacker reads the real system pressure — 72 PSI — then writes a fake value of 75 PSI to the HMI display override register and locks the screen refresh.
>
> The operator sitting in the control room? Their screen says 75 PSI, all systems normal, green checkmark. But that number is frozen. It will never update again. The real pressure is about to change dramatically, and the person whose job it is to notice... won't.
>
> This is what NERC CIP calls 'Loss of Situational Awareness,' and it's one of the most dangerous conditions in industrial security."

---

## STAGE 4 — THE PHYSICS BREACH

**On Screen (Map):** Camera pulls back to show HQ connecting to all three infrastructure nodes. Red attack traces animate from HQ to Substation Ashburn, Substation South, and Water Treatment. All nodes turn red with pulsing rings.

**On Screen (Terminal):** Attacker displays and executes `plc_override.py`. The script loops through all three PLCs, disabling safety interlocks (coil 5), high-temp emergency shutoffs (coil 10), and killing both water pumps (coils 1 & 2) at each site. Summary: 3 PLCs compromised, 6 safety interlocks disabled, 6 cooling pumps offline.

**You Say:**

> "We've reached the point of no return. The attacker is no longer stealing data. They're no longer even in the IT world. They are issuing direct commands to physical equipment.
>
> Look at the terminal. `write_coil(5, False)` — that single line disables the safety interlock loop. That's the system designed to automatically shut things down if something goes wrong. It's gone. Then `write_coil(10, False)` — there goes the high-temperature emergency shutoff. And finally, `write_coil(1, False)` and `write_coil(2, False)` — both main water pumps at each site go offline.
>
> They do this to all three facilities in sequence. In under 30 seconds, six safety systems are disabled and six cooling pumps are turned off. Code has been converted into kinetic, physical action. And remember — the operator's screen still says everything is fine."

---

## STAGE 5 — THE FALLOUT

**On Screen (Map):** Camera zooms all the way out. Red traces extend from substations and water treatment to all three DC campuses. The cyan data center dots flash red and go dark one by one — Ashburn first, then Manassas, then Tysons. The map progressively dims. After ~16 seconds, the cascade overlay appears with impact statistics.

**On Screen (Terminal):** SCADA Alert Monitor shows multi-site critical events. Thermal gauges fill up in real time — 22°C → 28°C → 35°C → 42°C → 45°C SHUTDOWN. Each site reports auto-emergency shutdown. Final box: 4,140 MW at risk, 300+ facilities, $1M+/hr losses, 12-72 hour recovery.

**You Say:**

> "This is the final act. Without cooling water, thermodynamics takes over. The thermal gauges you see climbing on the right are real physics. Data center servers generate enormous heat. Without cooling, server room temperatures hit 45 degrees Celsius — that's 113 Fahrenheit — in about 60 seconds.
>
> Physical safety mechanisms that the attacker *couldn't* disable — the ones hardwired into the buildings — force emergency shutdowns to prevent fires. Watch the data center dots on the map.
>
> Ashburn goes first — that's the largest data center campus on the planet. 300+ facilities in Loudoun County alone. Then Manassas. Then Tysons.
>
> 4,140 megawatts of server capacity goes dark. AWS, Azure, government cloud services, financial platforms — all impacted simultaneously. Downstream losses exceed one million dollars per hour per facility. 95% of Fortune 500 companies have infrastructure here.
>
> The cloud in Northern Virginia is officially offline. And it started with one weak password on a vendor VPN."

---

## TRANSITION TO MITIGATIONS

After Stage 5, dismiss the cascade overlay with **Escape** or **CLOSE**, then transition to your mitigation/recommendation portion of the presentation.

**You Say:**

> "That's the attack. Five stages, from a brute-forced password to a regional blackout. Now let's talk about how Royal Duke stops this — and what it actually costs."

---

## KEY TALKING POINTS (if asked)

- **Why Modbus?** — It was designed in 1979 for serial communication. No authentication, no encryption. It was never meant to be on a network. But it is.
- **Is this realistic?** — Every tool shown (Hydra, nmap, pymodbus) is freely available. The Modbus techniques mirror exactly what CISA documented in the 2023 CyberAv3ngers attack on U.S. water systems and what Sandworm used against Ukraine's power grid in 2015-2016.
- **Volt Typhoon** — CISA confirmed in Feb 2024 that Chinese state actors have been pre-positioning in U.S. critical infrastructure for *years*, specifically targeting water and energy systems. This isn't theoretical.
- **NERC CIP penalties** — Up to $1 million per day per violation. The flat IT/OT network alone would violate CIP-005 (Electronic Security Perimeters) and CIP-007 (System Security Management).
