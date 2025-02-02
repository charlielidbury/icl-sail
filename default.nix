with import <nixpkgs> {};
stdenv.mkDerivation rec {
        name = "icl-sail";
        buildInputs = [ nodejs_23, git ];
}