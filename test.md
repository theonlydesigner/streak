# STREAK Final Software Test

This test checks that the STREAK software works before authentication and deployment.

This is a software-only test. It does not test a real Raspberry Pi, RFID reader, display, network recovery, or real keyfobs.

The local demo uses `admin` as both the username and password by default. Environment variables are optional for this software-only test. Never commit custom tokens to the repository.

## 1. Open the project folder

Open PowerShell and run:

```powershell
cd C:\Users\Pratham\Desktop\Streak
```

## 2. Install dependencies

```powershell
npm install
```

Expected result: npm finishes without errors.

## 3. Run all automated tests

```powershell
npm test
```

Expected result: all test files pass.

## 4. Check TypeScript

```powershell
npx tsc --noEmit
```

Expected result: the command finishes without TypeScript errors.

## 5. Start the demo

Run this command:

```powershell
npm run demo
```

For custom credentials instead, set both variables before starting:

```powershell
$env:STREAK_ADMIN_TOKEN="replace-with-a-long-random-token"
$env:STREAK_DEVICE_CREDENTIAL="replace-with-a-device-token"
npm run demo
```

Keep this PowerShell window open.

Expected result:

```text
STREAK demo running at http://localhost:3001
```

## 6. Open the display

Open this address in your browser:

```text
http://localhost:3001/display?gym=gym-1
```

Check that:

- The dark STREAK display loads.
- The leaderboard is visible.
- The orange colors and rank highlights are visible.
- Rahul appears in the seeded leaderboard.
- The page does not show a blank screen.

## 7. Test a simulated member tap

Open a second PowerShell window and run:

```powershell
cd C:\Users\Pratham\Desktop\Streak
Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'application/json' -Body '{"member_id":"member-1"}' http://localhost:3001/demo/tap
```

Expected result:

- The command returns HTTP status `202`.
- The response contains `"status":"accepted"`.
- The response contains `"member_id":"member-1"`.

Look at the display. It should:

1. Show Rahul's welcome card.
2. Show his active streak and personal best.
3. Dim the leaderboard behind the welcome card.
4. Return to the leaderboard after about five seconds.

## 8. Test a duplicate tap

Run the same command again:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'application/json' -Body '{"member_id":"member-1"}' http://localhost:3001/demo/tap
```

Expected result: the response reports `"status":"duplicate"` because the same member cannot create two visits on the same day.

## 9. Test the gateway console

The admin console requires the admin bearer token. Verify that an unauthenticated request is rejected:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3001/admin/gateway-test?gym=gym-1
```

Expected result: HTTP `401`.

Verify the authenticated page response:

```powershell
$headers = @{ Authorization = "Bearer $env:STREAK_ADMIN_TOKEN" }
Invoke-WebRequest -UseBasicParsing -Headers $headers http://localhost:3001/admin/gateway-test?gym=gym-1
```

Expected result: HTTP `200`, with the software-only gateway console HTML.

The browser console itself is a software simulation. The console endpoint is authenticated with the admin token.

Open the console in a browser. For the default demo, use username `admin` and password `admin`. With custom credentials, use username `admin` and the value of `$env:STREAK_ADMIN_TOKEN` as the password.

## 10. Test card mapping

The mapping API also requires the admin bearer token:

```powershell
$headers = @{ Authorization = "Bearer $env:STREAK_ADMIN_TOKEN"; "Content-Type" = "application/json" }
Invoke-WebRequest -UseBasicParsing -Headers $headers http://localhost:3001/v1/gyms/gym-1/card-mappings
```

Expected result: HTTP `200`.

Verify that an unauthenticated mapping request is rejected:

```text
http://localhost:3001/admin/mappings?gym=gym-1
```

Expected result: HTTP `401` unless the request includes the admin bearer header.

Check the mapping API or an authenticated admin request to confirm:

- Card ID and Member ID remain separate.
- Existing mappings can be viewed.
- A valid member can receive a card.
- An unknown member is rejected.
- A duplicate card assignment is rejected.

## 11. Test member management

Open the authenticated admin page:

```text
http://localhost:3001/admin/mappings?gym=gym-1
```

Create a member using:

```text
Card ID: XYZ789
Member ID: member-4
Name: Priya
```

Expected result:

- Priya appears in the Members list.
- Her active streak and personal best are both `0`.
- Her card is shown as `XYZ789`.
- Priya appears on the public leaderboard.

Open the gateway test console and enter `XYZ789`. Expected result: the tap is accepted, Priya receives the welcome card, and her streak becomes `1`. Enter `XYZ789` again on the same day and expect a duplicate result.

Use **Edit** to change Priya's name or card. Use **Remove member** to remove her; the member and card mapping should disappear from the admin page and leaderboard.

## 12. Final result

The software check passes when:

- `npm test` passes.
- `npx tsc --noEmit` finishes without errors.
- The display loads.
- A simulated tap is accepted.
- The welcome card appears and then expires.
- A repeated tap is reported as a duplicate.
- The gateway test console loads.
- The card mapping page loads.
- A new member can be created, tapped, edited, and removed.
- Unauthenticated admin requests return `401`.
- Authenticated admin requests return `200`.

After testing, stop the demo by focusing the PowerShell window running it and pressing:

```text
Ctrl + C
```

The admin token is pilot authentication. Hosted login, deployment, physical hardware, real keyfobs, and physical display behavior are still separate steps.
