import React, { useContext, useEffect } from "react";
import { Input, Row } from "reactstrap";
import { RiCloseLine } from "react-icons/ri";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const FileUploadBrowser = ({ values, setFieldValue, dispatch, onlyPreview, small, ...props }) => {
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, "common");
    useEffect(() => {
        dispatch && dispatch({ type: "SETBROWSERIMAGE", payload: values })
    }, [values])

    function addFileFromFileList(newFiles) {
        const dt = new DataTransfer();
        const existingFiles = values[props.name] || [];
        for (let i = 0; i < existingFiles.length; i++) {
            dt.items.add(existingFiles[i]);
        }
        for (let i = 0; i < newFiles.length; i++) {
            dt.items.add(newFiles[i]);
        }
        return dt.files;
    }

    function removeFileFromFileList(index) {
        const dt = new DataTransfer();
        const files = values[props.name];
        for (let i = 0; i < files.length; i++) {
            if (index !== i) dt.items.add(files[i]);
        }
        return dt.files;
    }

    function ImageShow(fileDetail) {
        return fileDetail ? (
            props.multiple ? (
                [...fileDetail]?.map((elem, i) => (
                    <div key={i} className="col">
                        <div className="preview-item">
                            {elem?.type?.startsWith('image/') ? (
                                <img src={elem instanceof File ? URL.createObjectURL(elem) : elem} alt="preview" />
                            ) : (
                                <div className="file-icon-placeholder">
                                    <span className="small">{elem?.name?.split('.').pop()}</span>
                                </div>
                            )}
                            {elem instanceof File && (
                                <div className="remove-btn" onClick={() => setFieldValue(props.name, removeFileFromFileList(i))}>
                                    <RiCloseLine />
                                </div>
                            )}
                        </div>
                    </div>
                ))
            ) : null
        ) : null;
    }

    const onSelect = (event) => {
        if (event.currentTarget.files.length + (values[props.name]?.length || 0) > 10) {
            return ToastNotification('error', `Maximum 10 files allowed.`)
        } else {
            setFieldValue(props.name, props.multiple ? addFileFromFileList(event.currentTarget.files) : event.currentTarget.files[0], props.index);
        }
    }

    if (onlyPreview) {
        return (
            <div className="preview-container mt-2">
                <div className="row row-cols-5 g-3">
                    {values?.[props.name] && ImageShow(values?.[props.name])}
                </div>
            </div>
        );
    }

    return (
        <div className="upload-trigger">
            <label htmlFor={props.id || "file-upload"} className={`btn ${small ? 'btn-outline-primary btn-sm' : 'btn-primary px-4 py-2'} shadow-sm fw-bold`}>
                {small ? t("AddMore") || "Add More" : t("browsefiles")}
                <Input {...props} id={props.id || "file-upload"} type="file" className="d-none" onChange={(event) => onSelect(event)} />
            </label>
        </div>
    );
};
export default FileUploadBrowser;