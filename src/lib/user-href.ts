/** A reader's profile page; resolves to /profile for the viewer themself */
export function userHref(user: { id: string; username: string | null }) {
  return `/users/${encodeURIComponent(user.username ?? user.id)}`;
}
