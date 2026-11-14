const base = "https://api.binwoken.sh";

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  credits: number;
  key: string;
  ip: string;
};

export type Instance = {
  id: number;
  name: string;
  url: string;
  type: string;
  shape: string;
  slots: number;
  minutes: number;
  credits: number;
  users: string[];
  guilds: string[];
  state: string;
  created: number;
};

export type HistoryCreated = {
  name: string;
  href: string;
  type: string;
  created: number;
};

export type Usage = {
  description: string;
  amount: number;
  created: number;
};

async function request(method: string, path: string, body?: object) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
      "Content-Type": "application/json",
    },
    body: body && JSON.stringify(body),
  });
  if (response.status === 401 && localStorage.getItem("token")) {
    localStorage.removeItem("token");
    location.assign("/signin");
  }
  return response.json();
}

export const api = {
  signup: async (body: { first_name: string; last_name: string; email: string; password: string; turnstile: string }) => {
    const row = await request("POST", "/auth/signup", body);
    if (row.token) localStorage.setItem("token", row.token);
    return row as User & { message?: string };
  },
  signin: async (body: { email: string; password: string; turnstile: string }) => {
    const row = await request("POST", "/auth/signin", body);
    if (row.token) localStorage.setItem("token", row.token);
    return row as User & { message?: string };
  },
  logout: async () => {
    await request("POST", "/auth/logout", {});
    localStorage.removeItem("token");
  },
  me: () => request("GET", "/users/me") as Promise<User>,
  resetName: (first_name: string, last_name: string) => request("POST", "/auth/name", { first_name, last_name }),
  resetEmail: (email: string) => request("POST", "/auth/email", { email }),
  resetPassword: async (old_password: string, new_password: string) => {
    const response = await fetch(base + "/auth/password", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ old_password, new_password }),
    });
    return { status: response.status, body: await response.json() };
  },
  rotateKey: () => request("POST", "/users/me/keys", {}) as Promise<{ key: string }>,
  instances: () => request("GET", "/users/me/instances") as Promise<Instance[]>,
  createInstance: (body: {
    name: string;
    url: string;
    type: string;
    shape: string;
    slots: number;
    minutes: number;
    credits: number;
    users: string[];
    guilds: string[];
  }) => request("POST", "/users/me/instances", body) as Promise<Instance>,
  startInstance: (id: number) => request("POST", "/users/me/instances", { start: id }),
  stopInstance: (id: number) => request("POST", "/users/me/instances", { stop: id }),
  deleteInstance: (id: number) => request("POST", "/users/me/instances", { delete: id }),
  editInstance: (id: number, body: { url: string; users: string[]; guilds: string[] }) =>
    request("POST", "/users/me/instances", { edit: id, ...body }) as Promise<{ ok?: boolean; message?: string }>,
  created: () => request("GET", "/users/me/history/created") as Promise<HistoryCreated[]>,
  usage: () => request("GET", "/users/me/history/usage") as Promise<Usage[]>,
  bump: (id: string) => request("POST", "/v1/downloads", { id }) as Promise<{ id: string; count: number }>,
  searches: () => request("GET", "/v1/searches") as Promise<{ users: number; guilds: number }>,
  statistics: () =>
    request("GET", "/v1/statistics") as Promise<{
      partners: { days: { day: number; statistics: number[] }[]; totals: number[] };
      deepwoken: { days: { day: number; playing: number }[]; thumbnail: string };
    }>,
  search: async (body: { userId?: string; username?: string; guild?: string; turnstile: string }) => {
    const response = await fetch(base + "/v1/server", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  },
};
