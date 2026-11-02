import { describe, expect, it } from "vitest";
import { canSee, isAudience, type Relationship } from "@/lib/audience";

const stranger: Relationship = {
  isSelf: false,
  isFollowing: false,
  followsYou: false,
  isFriend: false,
};
const follower = { ...stranger, isFollowing: true };
const followedBy = { ...stranger, followsYou: true };
const friend = { ...stranger, isFollowing: true, followsYou: true, isFriend: true };
const self = { ...stranger, isSelf: true };

describe("canSee", () => {
  it("shows public content to everyone", () => {
    expect(canSee("public", stranger)).toBe(true);
  });
  it("shows followers content only to people who follow the owner", () => {
    expect(canSee("followers", stranger)).toBe(false);
    expect(canSee("followers", followedBy)).toBe(false);
    expect(canSee("followers", follower)).toBe(true);
    expect(canSee("followers", friend)).toBe(true);
  });
  it("shows friends content only to mutual follows", () => {
    expect(canSee("friends", follower)).toBe(false);
    expect(canSee("friends", followedBy)).toBe(false);
    expect(canSee("friends", friend)).toBe(true);
  });
  it("hides private content from everyone but the owner", () => {
    expect(canSee("private", friend)).toBe(false);
    expect(canSee("private", self)).toBe(true);
  });
});

describe("isAudience", () => {
  it("accepts only the four audiences", () => {
    expect(isAudience("friends")).toBe(true);
    expect(isAudience("everyone")).toBe(false);
    expect(isAudience(null)).toBe(false);
  });
});
