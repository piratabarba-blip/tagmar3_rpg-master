/** Retratos animados da ficha; não altera a imagem do token nem dados de regras. */
export function isVideoPortrait(src) {
    return typeof src === "string" && /\.(?:webm|mp4|m4v|ogv)(?:[?#].*)?$/i.test(src.trim());
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
    const media = event.currentTarget;
    const {img} = sheet.document.constructor.getDefaultArtwork?.(sheet.document.toObject()) ?? {};
    const picker = new foundry.applications.apps.FilePicker.implementation({
        type: "imagevideo",
        current: sheet.document.img,
        document: sheet.document,
        redirectToRoot: img ? [img] : [],
        callback: path => {
            if (!sheet.isEditable || !path) return;
            // O campo oculto preserva o retrato de vídeo nos próximos envios do formulário.
            const field = sheet.form?.querySelector('input[name="img"]');
            if (field) field.value = path;
            media.setAttribute("src", path);
            // Salva junto com os demais campos; o novo render escolhe img ou video.
            return sheet._onSubmit(event, {updateData: {img: path}, preventClose: true});
        },
        position: {top: sheet.position.top + 40, left: sheet.position.left + 10}
    });
    return picker.browse();
}
