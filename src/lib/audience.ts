// Privacy audiences, shared by the server, the settings UI and the API

export const AUDIENCES = ["public", "followers", "friends", "private"] as const;

export type Audience = (typeof AUDIENCES)[number];

export function isAudience(value: unknown): value is Audience {
  return AUDIENCES.includes(value as Audience);
}

/** How the viewer relates to a profile's owner; friends follow each other */
export type Relationship = {
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  isFriend: boolean;
};

/** Whether a viewer with `rel` to the owner is in `audience` */
export function canSee(audience: Audience, rel: Relationship): boolean {
  if (rel.isSelf) return true;
  switch (audience) {
    case "public":
      return true;
    case "followers":
      return rel.isFollowing;
    case "friends":
      return rel.isFriend;
    case "private":
      return false;
  }
}
