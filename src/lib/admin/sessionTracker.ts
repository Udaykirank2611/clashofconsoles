const KEY = "coc_admin_session_id";

export function clientInfo() {
  if (typeof navigator === "undefined") return {};
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Other";
  const device = /iPhone|Android.+Mobile/.test(ua)
    ? "Mobile"
    : /iPad|Android|Tablet/.test(ua)
      ? "Tablet"
      : /Windows/.test(ua)
        ? "Windows PC"
        : /Mac/.test(ua)
          ? "Mac"
          : "Desktop";
  return { browser, device };
}

export const getSessionId = () => (typeof localStorage === "undefined" ? null : localStorage.getItem(KEY));
export const setSessionId = (id: string | null) => {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
};
