export async function discordUser(token) {
    const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: "Bearer " + token },
    });
    if (!response.ok) return null;
    return response.json();
}
