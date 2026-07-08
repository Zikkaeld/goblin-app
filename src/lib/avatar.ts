const AVATAR_EMOJIS = ['🧑', '👩', '🧔', '👨‍🦲', '👵', '👨‍🌾', '👩‍🦰', '🧑‍🦱', '👩‍🦳', '🧑‍🦰', '👨‍🚀', '🧙'];

export function avatarForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_EMOJIS[Math.abs(hash) % AVATAR_EMOJIS.length];
}
