# Cursor Automation — Monday marketing drafts

Agents cannot create Cursor Automations via API. **You** create this once in the Cursor UI. The automation only **drafts** copy into the repo for your approval — it must not post or buy ads.

## What it should do every Monday

1. Read `docs/marketing/AGENT_BRIEF.md` and `docs/marketing/WEEKLY_SYSTEM.md`.  
2. Skim `docs/marketing/GROWTH_TRACKER.md` for unfinished activation / referral rows.  
3. Create `docs/marketing/drafts/week-NN.md` (or `YYYY-Www.md`) from `docs/marketing/templates/weekly-draft.md`.  
4. Fill HR + EN assets in priority order (activation → referrals → one distribution touch → 2 tips → soft CTA).  
5. Leave `Status: draft` and include the Approval checklist.  
6. Open a PR titled `marketing: week N drafts` (docs only).  
7. **Stop.** Do not publish anywhere.

## Suggested Automation prompt (paste into Cursor)

```
You are the Vinar Marketing Co-pilot. Follow docs/marketing/AGENT_BRIEF.md and docs/marketing/WEEKLY_SYSTEM.md strictly.

Task (Monday weekly draft):
1. Read docs/marketing/GROWTH_TRACKER.md.
2. Create the next weekly file under docs/marketing/drafts/ using docs/marketing/templates/weekly-draft.md.
3. Prioritize: activation follow-ups, referral asks, one distribution touch, two educational posts, one soft CTA.
4. Every asset: Croatian block first, English twin second.
5. Do NOT publish to any social network. Do NOT create ads. Do NOT spend money.
6. Set Status: draft. Include the Approval checklist from AGENT_BRIEF.md.
7. Open a PR titled "marketing: week N drafts" with only docs/marketing/** changes.

If the previous week draft is still Status: draft (not approved/done), do not invent a full new week — instead leave a short note in the PR asking the human to approve or close the previous draft first.
```

## Schedule

- **When:** Mondays (morning local time is fine).  
- **Repo:** this Vinar repository.  
- **Model / agent:** whatever you use for Cloud Agents; keep the prompt above as the instruction.

## Your weekly job after the Automation runs

1. Open the PR / draft file.  
2. Edit names, links, and group-specific wording.  
3. Set `Status: approved`.  
4. Send DMs and posts **manually**.  
5. Update `GROWTH_TRACKER.md` and the Sunday KPI block.  
6. Merge or close the PR when the week is done (`Status: done`).

## Guardrails checklist when creating the Automation

- [ ] Prompt includes “do not publish” and “do not create ads”  
- [ ] Output path is only `docs/marketing/**`  
- [ ] No secrets for Meta/Google Ads in the environment for this automation  
- [ ] You still approve every post before it goes live  
