import Image from "next/image";
import { Input, Label, Col } from "reactstrap";
import AttachmentsDropdown from "./AttachmentDropdown";

const AttachmentData = ({ state, dispatch, multiple, attachmentsData, refetch, redirectToTabs }) => {
    // useEffect(() => {
    //     refetch();
    // }, []);
    // Selecting images from media modal
    const ChoseImages = (e, item) => {
        if (multiple) {
            if (!e.target.checked) {
                let removeDuplicatesImage = [...state.selectedImage]
                removeDuplicatesImage = removeDuplicatesImage.filter((el) => {
                    return el.id !== item.id
                })
                dispatch({
                    type: "SELECTEDIMAGE", payload: state?.selectedImage?.length > 0 ? removeDuplicatesImage : [item]
                })
            } else {
                dispatch({
                    type: "SELECTEDIMAGE", payload: state?.selectedImage?.length > 0 ? [...state.selectedImage, item] : [item]
                })
            }
        } else {
            dispatch({ type: "SELECTEDIMAGE", payload: [item] })
        }
    };
    return (
        <>
            {attachmentsData?.map((elem, i) => (
                <Col key={i}>
                    <div className="library-box">
                        <div className="attachment-name">
                            <span>{elem.name || elem.file_name || elem.id || "Media"}</span>
                        </div>
                        <Input type="checkbox" id={elem.id} checked={state?.selectedImage?.some((item) => item.id === elem.id)} onChange={(e) => ChoseImages(e, elem)} />
                        <Label htmlFor={elem.id}>
                            <div className="ratio ratio-1x1">
                                <img src={elem.original_url} alt={elem.name} />
                            </div>
                        </Label>
                        {!redirectToTabs && <AttachmentsDropdown id={elem?.id} />}
                    </div>
                </Col>
            ))}
        </>
    );
};

export default AttachmentData;