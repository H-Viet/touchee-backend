export interface JwtPayload {
  sub: string; // User.id (not Account.id — this is what the rest of the app cares about)
  email: string;
  username: string;
}
