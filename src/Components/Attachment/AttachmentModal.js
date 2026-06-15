import React, { useContext, useEffect, useReducer, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Form, Formik } from "formik";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
    X, Search, SlidersHorizontal, UploadCloud, Link as LinkIcon, 
    Trash2, Check, FileImage, Image as ImageIcon, Loader2, Info, ChevronLeft, ChevronRight
} from "lucide-react";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";
import request from "../../Utils/AxiosUtils";
import { attachment, createAttachment } from "../../Utils/AxiosUtils/API";
import useCreate from "../../Utils/Hooks/useCreate";
import useDelete from "../../Utils/Hooks/useDelete";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import { selectImageReducer } from "../../Utils/AllReducers";
import FileUploadBrowser from "../InputFields/FileUploadBrowser";
import Btn from "../../Elements/Buttons/Btn";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";

const AttachmentNameObserver = ({ values, setFieldValue }) => {
    useEffect(() => {
        if (values.attachments?.length > 0 && !values.name) {
            const fileName = values.attachments[0].name.split('.').slice(0, -1).join('.');
            setFieldValue("name", fileName);
        } else if (values.url && !values.name) {
            try {
                const url = new URL(values.url);
                const pathParts = url.pathname.split('/');
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart) {
                    const fileName = lastPart.split('.').slice(0, -1).join('.');
                    if (fileName) setFieldValue("name", fileName);
                }
            } catch (e) {
                const pathParts = values.url.split('/');
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart && lastPart.includes('.')) {
                    const fileName = lastPart.split('.').slice(0, -1).join('.');
                    if (fileName) setFieldValue("name", fileName);
                }
            }
        }
    }, [values.attachments, values.url]);
    return null;
};

const AttachmentModal = (props) => {
    const { modal, setModal, setFieldValue, name, setSelectedImage, isattachment, multiple, values, showImage, redirectToTabs, noAPICall } = props;
    const [createPerm] = usePermissionCheck(["create"], "attachment");
    const [destroyPerm] = usePermissionCheck(["destroy"], "attachment");
    const { i18Lang } = useContext(I18NextContext);
    const { t } = useTranslation(i18Lang, 'common');
    
    const [tabNav, setTabNav] = useState(1); // 1 = Select File, 2 = Upload New
    const [search, setSearch] = useState("");
    const [searchText, setSearchText] = useState("");
    const [page, setPage] = useState(1);
    const [paginate] = useState(24); // More items per page for a better grid experience
    const [sorting, setSorting] = useState("newest");
    
    // Delete state
    const [deletingId, setDeletingId] = useState(null);
    const { mutate: deleteMutate, isLoading: isDeleting } = useDelete(attachment, '/attachment', () => {
        refetch();
        setDeletingId(null);
        dispatch({ type: "SELECTEDIMAGE", payload: [] });
    });

    const [state, dispatch] = useReducer(selectImageReducer, { selectedImage: [], isModalOpen: "", setBrowserImage: '' });
    
    const { data: attachmentsData, refetch, isFetching } = useQuery(
        [attachment, search, sorting, page], 
        () => request({ 
            url: attachment, 
            params: { 
                search, 
                sort: sorting, 
                paginate: paginate, 
                page 
            } 
        }), 
        { 
            enabled: false, 
            refetchOnWindowFocus: false, 
            select: (data) => data?.data 
        }
    );
    
    const queryClient = useQueryClient();
    
    const { mutate: uploadMutate, isLoading: isUploading } = useCreate(
        createAttachment, 
        false, 
        false, 
        redirectToTabs ? "No" : "Attachment Created Successfully", 
        () => {
            refetch();
            queryClient.invalidateQueries([attachment]);
            if (!redirectToTabs) {
                setModal(false);
            } else {
                setTabNav(1);
            }
        }
    );

    // Initial load and refetch on filter change
    useEffect(() => {
        if (modal && !noAPICall) {
            refetch();
        }
        if (isattachment) {
            setTabNav(2);
        }
    }, [search, sorting, page, modal]);

    // Handle debounced search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchText);
            setPage(1);
        }, 600);
        return () => clearTimeout(timer);
    }, [searchText]);

    const selectImage = (item) => {
        const selected = state?.selectedImage || [];
        if (multiple) {
            const isSelected = selected.some(el => el.id === item.id);
            if (isSelected) {
                dispatch({
                    type: "SELECTEDIMAGE", 
                    payload: selected.filter(el => el.id !== item.id)
                });
            } else {
                dispatch({
                    type: "SELECTEDIMAGE", 
                    payload: [...selected, item]
                });
            }
        } else {
            dispatch({ type: "SELECTEDIMAGE", payload: [item] });
        }
    };

    const handleConfirmSelection = () => {
        const value = state?.selectedImage || [];
        const storeImageObject = name?.split("_id")[0];

        if (multiple) {
            if (value && value.length > 0) {
                setSelectedImage([...value]);
                setFieldValue(name, value.map((el) => el.id));
            }
        } else {
            if (value && value.length > 0) {
                if (showImage) {
                    setFieldValue(name, value[0]);
                } else {
                    const matchedItem = attachmentsData?.data?.find(item => item.id === value[0].id) || value[0];
                    setFieldValue(name, matchedItem.id);
                    if (storeImageObject) {
                        setFieldValue(storeImageObject, matchedItem);
                    }
                    setSelectedImage([matchedItem]);
                }
            }
        }
        setModal(false);
    };

    // Calculate total pages
    const totalItems = attachmentsData?.total || 0;
    const totalPages = Math.ceil(totalItems / paginate) || 1;

    // Get active selected item details (for sidebar preview)
    const activePreviewItem = state?.selectedImage?.[(state?.selectedImage?.length || 0) - 1] || null;

    return (
        <Dialog.Root open={modal} onOpenChange={setModal}>
            <Dialog.Portal>
                {/* Backdrop Overlay */}
                <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] transition-opacity duration-300" />
                
                {/* Modal Container */}
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl border border-slate-100 shadow-2xl z-[10000] w-[95vw] max-w-7xl h-[85vh] max-h-[850px] flex flex-col overflow-hidden outline-none font-sans">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-6">
                            <Dialog.Title className="text-xl font-bold text-slate-800 leading-tight">
                                {t("InsertMedia")}
                            </Dialog.Title>
                            
                            {/* Premium Tab Selector */}
                            {!isattachment && (
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        type="button"
                                        onClick={() => setTabNav(1)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                            tabNav === 1 
                                                ? "bg-white text-slate-850 shadow-sm" 
                                                : "text-slate-500 hover:text-slate-850"
                                        }`}
                                    >
                                        {t("SelectFile")}
                                    </button>
                                    {createPerm && (
                                        <button 
                                            type="button"
                                            onClick={() => setTabNav(2)}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                                tabNav === 2 
                                                    ? "bg-white text-slate-850 shadow-sm" 
                                                    : "text-slate-500 hover:text-slate-850"
                                            }`}
                                        >
                                            {t("UploadNew")}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <Dialog.Close asChild>
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Main Area */}
                    <div className="flex-grow min-h-0 flex overflow-hidden">
                        {tabNav === 1 ? (
                            // TAB 1: Select File
                            <div className="flex-1 flex min-h-0 w-100">
                                
                                {/* Left Section: Search and Grid */}
                                <div className="flex-1 flex flex-col min-w-0 p-6 border-r border-slate-100">
                                    {/* Search & Sort Panel */}
                                    <div className="flex flex-col sm:flex-row gap-4 mb-6 shrink-0">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="search"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
                                                placeholder={t("Searchyourfiles")}
                                                value={searchText}
                                                onChange={(e) => setSearchText(e.target.value)}
                                            />
                                        </div>
                                        <div className="relative sm:w-60">
                                            <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            <select
                                                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all cursor-pointer text-slate-700"
                                                value={sorting}
                                                onChange={(e) => { setSorting(e.target.value); setPage(1); }}
                                            >
                                                <option value="newest">{t("SortBynewest")}</option>
                                                <option value="oldest">{t("SortByoldest")}</option>
                                                <option value="smallest">{t("SortBysmallest")}</option>
                                                <option value="largest">{t("SortBylargest")}</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Grid Container */}
                                    <div className="flex-1 overflow-y-auto min-h-0 pr-1 select-file-scrollbar">
                                        {isFetching ? (
                                            <div className="flex flex-col items-center justify-content-center h-full w-full py-20 gap-3">
                                                <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
                                                <p className="text-slate-400 text-sm font-medium">{t("Loading...") || "Loading media..."}</p>
                                            </div>
                                        ) : !attachmentsData?.data || attachmentsData.data.length === 0 ? (
                                            <div className="flex flex-col items-center justify-content-center h-full w-full py-20 text-center">
                                                <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
                                                <h3 className="text-base font-bold text-slate-700 mb-1">{t("NoMediaFound") || "No Media Files Found"}</h3>
                                                <p className="text-slate-400 text-sm max-w-sm">{t("TryAdjustingYourSearch") || "Try adjusting your search query or upload new files to get started."}</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4">
                                                {attachmentsData.data.map((item) => {
                                                    const isSelected = state?.selectedImage?.some(el => el.id === item.id) || false;
                                                    return (
                                                        <div 
                                                            key={item.id}
                                                            className={`relative group aspect-square rounded-2xl border overflow-hidden cursor-pointer bg-slate-50 transition-all duration-200 ${
                                                                isSelected 
                                                                    ? "border-slate-800 ring-2 ring-slate-800/10 shadow-md" 
                                                                    : "border-slate-100 hover:border-slate-300 hover:shadow-sm"
                                                            }`}
                                                            onClick={() => selectImage(item)}
                                                        >
                                                            {/* Image */}
                                                            <img 
                                                                src={item.original_url} 
                                                                alt={item.name || "Media"} 
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                loading="lazy"
                                                            />
                                                            
                                                            {/* Selection Checkmark */}
                                                            {isSelected && (
                                                                <div className="absolute top-2 left-2 bg-slate-800 text-white p-1 rounded-lg z-10 shadow-sm animate-scaleIn">
                                                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                                </div>
                                                            )}

                                                            {/* Filename Overlay */}
                                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                <p className="text-[11px] text-white font-medium truncate text-center">
                                                                    {item.name || item.file_name || "Media"}
                                                                </p>
                                                            </div>

                                                            {/* Delete Option on Hover */}
                                                            {destroyPerm && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm(t("DeleteItem") + "?")) {
                                                                            deleteMutate(item.id);
                                                                        }
                                                                    }}
                                                                    className="absolute top-2 right-2 bg-white/95 hover:bg-red-50 text-slate-500 hover:text-red-650 p-1.5 rounded-lg z-10 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-[-2px] group-hover:translate-y-0"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pagination Row */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto shrink-0">
                                            <p className="text-xs text-slate-400">
                                                {t("Showing")} {(page - 1) * paginate + 1} {t("to")} {totalItems > page * paginate ? page * paginate : totalItems} {t("of")} {totalItems} {t("entries")}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={page === 1}
                                                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <span className="text-sm font-semibold text-slate-700 px-2">
                                                    {page} / {totalPages}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={page === totalPages}
                                                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Sidebar: Selected details & action */}
                                <div className="w-[320px] shrink-0 bg-slate-50/50 flex flex-col p-6 min-h-0">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                                        {t("SelectionDetails") || "Selection Details"}
                                    </h3>
                                    
                                    <div className="flex-1 flex flex-col justify-center min-h-0">
                                        {activePreviewItem ? (
                                            <div className="flex flex-col h-full justify-between">
                                                {/* Image Preview Card */}
                                                <div className="flex-grow flex flex-col justify-center gap-4">
                                                    <div className="aspect-video w-full rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm bg-white p-1">
                                                        <img 
                                                            src={activePreviewItem.original_url} 
                                                            alt="Selected preview"
                                                            className="w-full h-full object-contain rounded-xl"
                                                        />
                                                    </div>
                                                    
                                                    {/* File Metadata */}
                                                    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                                        <div className="space-y-1">
                                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("FileName") || "File Name"}</p>
                                                            <p className="text-sm font-semibold text-slate-800 break-all leading-tight">
                                                                {activePreviewItem.name || activePreviewItem.file_name}
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                                                            <div>
                                                                <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">{t("Size") || "Size"}</p>
                                                                <p className="font-medium text-slate-700">{activePreviewItem.size ? `${(activePreviewItem.size / 1024 / 1024).toFixed(2)} MB` : "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">{t("ID") || "ID"}</p>
                                                                <p className="font-medium text-slate-700">#{activePreviewItem.id}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Selected Counter & Confirm Actions */}
                                                <div className="mt-6 space-y-3 pt-4 border-t border-slate-200/60 shrink-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-500 font-medium">
                                                            {(state?.selectedImage?.length || 0)} {t("FileSelected")}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => dispatch({ type: "SELECTEDIMAGE", payload: [] })}
                                                            className="text-xs text-red-500 hover:text-red-750 font-bold hover:underline"
                                                        >
                                                            {t("Clear")}
                                                        </button>
                                                    </div>
                                                    
                                                    <button
                                                        type="button"
                                                        onClick={handleConfirmSelection}
                                                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-800/20 text-sm cursor-pointer"
                                                    >
                                                        {t("InsertMedia")}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                                                <Info className="w-8 h-8 text-slate-300 mb-2" />
                                                <p className="text-sm font-semibold text-slate-600 mb-1">{t("NoSelection") || "No Selection"}</p>
                                                <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                                                    {t("SelectAnImageFromTheLibraryToPreview") || "Select an image from the library to view details and confirm selection."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // TAB 2: Upload New
                            <div className="flex-1 p-6 overflow-y-auto">
                                <Formik
                                    initialValues={{ attachments: "", url: "", name: "" }}
                                    onSubmit={(values, { resetForm }) => {
                                        let formData = new FormData();
                                        if (values.attachments) {
                                            Object.values(values.attachments).forEach((el, i) => {
                                                formData.append(`attachments[${i}]`, el);
                                            });
                                        }
                                        if (values.url) {
                                            formData.append('url', values.url);
                                        }
                                        if (values.name) {
                                            formData.append('name', values.name);
                                        }
                                        uploadMutate(formData);
                                    }}
                                >
                                    {({ values, setFieldValue, errors, handleSubmit }) => (
                                        <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto">
                                            <AttachmentNameObserver values={values} setFieldValue={setFieldValue} />
                                            
                                            {/* Cards Grid */}
                                            <div className="grid md:grid-cols-2 gap-6">
                                                {/* Upload From Device */}
                                                <div className="border border-slate-200/80 rounded-3xl p-6 bg-white flex flex-col items-center justify-center min-h-[300px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:border-slate-300">
                                                    {!values.attachments?.length ? (
                                                        <div className="flex flex-col items-center text-center">
                                                            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-650 mb-4">
                                                                <UploadCloud className="w-8 h-8" />
                                                            </div>
                                                            <h3 className="text-base font-bold text-slate-800 mb-1">
                                                                {t("Upload From Device") || "Upload from Device"}
                                                            </h3>
                                                            <p className="text-xs text-slate-400 max-w-xs mb-5">
                                                                {t("SelectAnyLocalImage") || "Select JPG, PNG, GIF, or WebP files from your device."}
                                                            </p>
                                                            <FileUploadBrowser 
                                                                errors={errors} 
                                                                id="attachments" 
                                                                name="attachments" 
                                                                type="file" 
                                                                multiple={true} 
                                                                values={values} 
                                                                setFieldValue={setFieldValue} 
                                                                dispatch={dispatch} 
                                                                accept="image/*" 
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col">
                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                                                <h4 className="text-sm font-bold text-slate-800">
                                                                    {t("SelectedFiles")} ({values.attachments.length})
                                                                </h4>
                                                                <FileUploadBrowser 
                                                                    errors={errors} 
                                                                    id="attachments" 
                                                                    name="attachments" 
                                                                    type="file" 
                                                                    multiple={true} 
                                                                    values={values} 
                                                                    setFieldValue={setFieldValue} 
                                                                    dispatch={dispatch} 
                                                                    accept="image/*" 
                                                                    small={true} 
                                                                />
                                                            </div>
                                                            <div className="flex-1 overflow-y-auto max-h-[200px] pr-2">
                                                                <FileUploadBrowser 
                                                                    values={values} 
                                                                    setFieldValue={setFieldValue} 
                                                                    dispatch={dispatch} 
                                                                    name="attachments" 
                                                                    onlyPreview={true} 
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Import via URL */}
                                                <div className="border border-slate-200/80 rounded-3xl p-6 bg-white flex flex-col items-center justify-center min-h-[300px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:border-slate-300">
                                                    <div className="flex flex-col items-center text-center w-full">
                                                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-650 mb-4">
                                                            <LinkIcon className="w-8 h-8" />
                                                        </div>
                                                        <h3 className="text-base font-bold text-slate-800 mb-1">
                                                            {t("Import via URL") || "Import via URL"}
                                                        </h3>
                                                        <p className="text-xs text-slate-400 max-w-xs mb-5">
                                                            {t("Paste image URL") || "Paste a direct link to an image"}
                                                        </p>
                                                        
                                                        <input
                                                            type="text"
                                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-center bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all placeholder:text-slate-400"
                                                            placeholder="https://example.com/image.jpg"
                                                            value={values.url}
                                                            onChange={(e) => setFieldValue("url", e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Attachment Name Field */}
                                            <div className="border border-slate-200/80 rounded-3xl p-6 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                                <label className="block text-sm font-bold text-slate-800 mb-2">
                                                    {t("Attachment title") || "Attachment Title"}
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all placeholder:text-slate-400"
                                                    placeholder={t("Enter attachment title") || "Enter attachment title"}
                                                    value={values.name}
                                                    onChange={(e) => setFieldValue("name", e.target.value)}
                                                />
                                            </div>

                                            {/* Actions Footer */}
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                                {(values.attachments?.length > 0 || values.url) ? (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            setFieldValue('attachments', "");
                                                            setFieldValue("url", "");
                                                            setFieldValue("name", "");
                                                        }}
                                                        className="text-sm text-red-500 hover:text-red-750 font-bold hover:underline"
                                                    >
                                                        {t("ClearAll") || "Clear All"}
                                                    </button>
                                                ) : <div />}

                                                <Btn 
                                                    type="button" 
                                                    onClick={handleSubmit} 
                                                    className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md text-sm cursor-pointer" 
                                                    title={t("Add Media") || "Add Media"} 
                                                    loading={Number(isUploading)} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Formik>
                            </div>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default AttachmentModal;