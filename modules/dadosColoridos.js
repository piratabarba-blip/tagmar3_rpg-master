export function dadosColoridos(resultado, roll) {
    switch (resultado) {
        case "verde":
            roll.dice[0].options.appearance = {foreground: "#91cf50", outline: "#ffffff"};
            break;
        case "branco":
            roll.dice[0].options.appearance = {foreground: "#ffffff", outline: "#000000"};
            break;
        case "amarelo":
            roll.dice[0].options.appearance = {foreground: "#ffff00", outline: "#000000"};
            break;
        case "laranja":
            roll.dice[0].options.appearance = {foreground: "#ff9900", outline: "#ffffff"};
            break;
        case "vermelho":
            roll.dice[0].options.appearance = {foreground: "#ff0000", outline: "#ffffff"};
            break;
        case "azul":
            roll.dice[0].options.appearance = {foreground: "#00a1e8", outline: "#ffffff"};
            break;
        case "roxo":
            roll.dice[0].options.appearance = {foreground: "#0000ff", outline: "#ffffff"};
            break;
        case "cinza":
            roll.dice[0].options.appearance = {foreground: "#bfbfbf", outline: "#000000"};
            break;
        default:
            break;
    }
};