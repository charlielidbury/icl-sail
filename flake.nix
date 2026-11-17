{
  description = "ICL-Sail dev environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (
        pkgs:
        let
          # The Vercel CLI isn't packaged in nixpkgs, so run a pinned version from npm.
          vercel = pkgs.writeShellScriptBin "vercel" ''
            exec ${pkgs.pnpm_10}/bin/pnpm dlx vercel@65.17.0 "$@"
          '';
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_24
              pkgs.pnpm_10
              pkgs.git
              pkgs.supabase-cli
              vercel
              (pkgs.python3.withPackages (ps: [ ps.pillow ]))
            ];
          };
        }
      );
    };
}
