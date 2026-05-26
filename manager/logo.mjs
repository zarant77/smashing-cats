const LOGO = String.raw`
  ____                      _     _         _   ____      _       
 / ___| _ __ ___   __ _ ___| |__ (_)_ __   ( ) / ___|__ _| |_ ___ 
 \___ \| '_ \` _ \ / _\` / __| '_ \| | '_ \  |/ | |   / _\` | __/ __|
  ___) | | | | | | (_| \__ \ | | | | | | |    | |__| (_| | |_\__ \
 |____/|_| |_| |_|\__,_|___/_| |_|_|_| |_|     \____\__,_|\__|___/
`;

export function getLogo() {
  const trimmedLogo = LOGO.trimEnd();

  return {
    text: trimmedLogo,

    height: trimmedLogo.split("\n").length,
  };
}
