/** Retratos animados da ficha; mantém Actor.img restrito a imagens. */
export function isVideoPortrait(src) {
    return typeof src === "string" && /\.(?:webm|mp4|m4v|ogv)(?:[?#].*)?$/i.test(src.trim());
}

export function getPortraitData(actor) {
    const video = actor.flags?.[game.system.id]?.portraitVideo;
    const portraitIsVideo = isVideoPortrait(video);
    return {portraitIsVideo, portraitSrc: portraitIsVideo ? video : actor.img};
}

export function activatePortraitListeners(sheet, html) {
    html.find("video.tagmar-portrait").each((_index, video) => {
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
    });
    if (!sheet.isEditable) return;
    // O Foundry já vincula o clique nas imagens, mas não nos elementos de vídeo.
    html.find("video.tagmar-portrait").on("click", event => sheet._onEditImage(event));
    html.find(".tagmar-portrait").on("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            sheet._onEditImage(event);
        }
    });
}

export function editPortrait(sheet, event) {
    if (!sheet.isEditable) return;
    event.preventDefault();
    const {img} = sheet.document.constructor.getDefaultArtwork?.(sheet.document.toObject()) ?? {};
    const picker = new foundry.applications.apps.FilePicker.implementation({
        type: "imagevideo",
        current: getPortraitData(sheet.document).portraitSrc,
        document: sheet.document,
        redirectToRoot: img ? [img] : [],
        callback: path => {
            if (!sheet.isEditable || !path) return;
            const flagPath = `flags.${game.system.id}.portraitVideo`;
            const updateData = isVideoPortrait(path)
                ? {[flagPath]: path}
                : {img: path, [flagPath]: null};
            // Não modifica src/campos antes de salvar: uma rejeição não corrompe a prévia.
            // O render após o update lê a flag; Actor.img continua sendo uma imagem.
            return sheet._onSubmit(event, {updateData, preventClose: true});
        },
        position: {top: sheet.position.top + 40, left: sheet.position.left + 10}
    });
    return picker.browse();
}
