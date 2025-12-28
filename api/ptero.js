export default async function handler(req, res) {
  const { domain, apikey, action } = req.method === "POST"
    ? req.body
    : req.query;

  if (!domain || !apikey || !action) {
    return res.status(400).json({ error: "missing parameter" });
  }

  const headers = {
    Authorization: `Bearer ${apikey}`,
    "Content-Type": "application/json"
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let result = { action };

  try {
    // AMBIL SEMUA SERVER
    if (action === "delete-all" || action === "delete-offline") {
      const r = await fetch(`${domain}/api/application/servers?per_page=100`, { headers });
      const servers = (await r.json()).data;

      const targets = action === "delete-offline"
        ? servers.filter(s => s.attributes.current_state === "offline")
        : servers;

      let deleted = 0;
      for (const s of targets) {
        await fetch(`${domain}/api/application/servers/${s.attributes.id}`, {
          method: "DELETE",
          headers
        });
        deleted++;
        await sleep(400);
      }
      result.servers_deleted = deleted;
    }

    // DELETE UNUSED USER
    if (action === "delete-unused-users") {
      const r = await fetch(`${domain}/api/application/users?per_page=100`, { headers });
      const users = (await r.json()).data;

      let deleted = 0;
      for (const u of users) {
        if (u.attributes.root) continue;

        const sr = await fetch(
          `${domain}/api/application/servers?filter[owner_id]=${u.attributes.id}`,
          { headers }
        );
        const owned = (await sr.json()).data;

        if (owned.length === 0) {
          await fetch(`${domain}/api/application/users/${u.attributes.id}`, {
            method: "DELETE",
            headers
          });
          deleted++;
          await sleep(300);
        }
      }
      result.users_deleted = deleted;
    }

    res.json({ success: true, result });

  } catch (e) {
    res.status(500).json({ error: "execution failed", detail: e.message });
  }
                            }
