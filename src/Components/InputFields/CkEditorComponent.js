import dynamic from 'next/dynamic';
import React, { useContext, useState } from "react";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

// Dynamic import for the heavy CKEditor components
const CKEditor = dynamic(async () => {
    const { CKEditor: Component } = await import("@ckeditor/ckeditor5-react");
    return Component;
}, { ssr: false });

const ClassicEditor = dynamic(async () => {
    const { default: Editor } = await import("@ckeditor/ckeditor5-build-classic");
    return Editor;
}, { ssr: false });

function CkEditorComponent({ onChange, editorLoaded, name, value }) {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');

    return (
        <div>
            {editorLoaded ? (
                <CKEditor
                    name={name}
                    editor={ClassicEditor}
                    data={value || ""}
                    onChange={(event, editor) => {
                        const data = editor.getData();
                        onChange(data);
                    }}
                />
            ) : (
                <div className="ck-loading-placeholder">{t("Editorloading")}</div>
            )}
        </div>
    );
}

export default CkEditorComponent;
