// The deploy that's live, prerendered per build; NewVersion compares it with the one it loaded.
export const GET = () => Response.json(process.env.APP_VERSION);
