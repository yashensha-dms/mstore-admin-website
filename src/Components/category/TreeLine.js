import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RiDragDropLine, RiArrowUpSLine, RiArrowDownSLine } from "react-icons/ri";
import Options from "../Table/Options";
import request from "../../Utils/AxiosUtils";
import { Category } from "../../Utils/AxiosUtils/API";
import { ToastNotification } from "../../Utils/CustomFunctions/ToastNotification";

const TreeLine = ({ data, level = 0, active, setActive, type, mutate, loading, refetch }) => {
  const router = useRouter();
  const [items, setItems] = useState(data || []);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setItems(data || []);
  }, [data]);

  if (!items || !items.length) return null;

  const persistOrder = async (newList) => {
    const previousList = items;
    setItems(newList);
    setIsSaving(true);
    try {
      const categoryIds = newList.map((item) => item.id);
      const res = await request({
        url: `${Category}/reorder`,
        method: "PATCH",
        data: { category_ids: categoryIds },
      });
      if (res?.data?.success || res?.status === 200) {
        ToastNotification("success", "Category order updated successfully");
        if (refetch) refetch();
      } else {
        ToastNotification("error", "Failed to update category order");
        setItems(previousList);
      }
    } catch (error) {
      ToastNotification("error", error?.response?.data?.message || "Failed to update category order");
      setItems(previousList);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e, index) => {
    e.stopPropagation();
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const updated = [...items];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    persistOrder(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveUp = (index, e) => {
    e.stopPropagation();
    if (index <= 0 || isSaving) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    persistOrder(updated);
  };

  const moveDown = (index, e) => {
    e.stopPropagation();
    if (index >= items.length - 1 || isSaving) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    persistOrder(updated);
  };

  return (
    <ul>
      {items.map((item, i) => {
        const isDragging = draggedIndex === i;
        const isTarget = dragOverIndex === i && draggedIndex !== null && draggedIndex !== i;

        return (
          <li
            key={item.id || i}
            className={item.subcategories?.length ? "inside-ul" : ""}
            style={{
              color: router?.query?.updateId == item.id ? "#0da487" : "",
              opacity: isDragging ? 0.45 : 1,
              borderTop: isTarget ? "2px dashed #0da487" : "none",
              backgroundColor: isTarget ? "rgba(13, 164, 135, 0.05)" : "transparent",
              transition: "background-color 0.15s ease, border 0.15s ease",
            }}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={(e) => handleDragLeave(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
          >
            <div
              className={`${item.status == 0 ? "disabled" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (item.subcategories?.length) {
                  let temp = [...active];
                  active.includes(item.id)
                    ? temp.splice(temp.indexOf(item.id), 1)
                    : temp.push(item.id);
                  setActive([...temp]);
                }
              }}
              style={{ display: "flex", alignItems: "center" }}
            >
              {/* Drag Handle & Up/Down Movement Controls */}
              <div
                className="category-reorder-controls me-2"
                onClick={(e) => e.stopPropagation()}
                style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}
              >
                <span
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragEnd={handleDragEnd}
                  title="Drag and drop to reorder"
                  style={{
                    cursor: "grab",
                    display: "inline-flex",
                    alignItems: "center",
                    color: "#898989",
                    padding: "2px 3px",
                  }}
                >
                  <RiDragDropLine size={15} />
                </span>

                <button
                  type="button"
                  disabled={i === 0 || isSaving}
                  onClick={(e) => moveUp(i, e)}
                  title="Move up"
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: "1px 2px",
                    cursor: i === 0 || isSaving ? "not-allowed" : "pointer",
                    opacity: i === 0 || isSaving ? 0.25 : 0.75,
                    display: "inline-flex",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  <RiArrowUpSLine size={15} />
                </button>

                <button
                  type="button"
                  disabled={i === items.length - 1 || isSaving}
                  onClick={(e) => moveDown(i, e)}
                  title="Move down"
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: "1px 2px",
                    cursor: i === items.length - 1 || isSaving ? "not-allowed" : "pointer",
                    opacity: i === items.length - 1 || isSaving ? 0.25 : 0.75,
                    display: "inline-flex",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  <RiArrowDownSLine size={15} />
                </button>
              </div>

              <i className="tree-icon file-icon" role="presentation"></i>
              <span className="category-title" style={{ flex: 1 }}>
                {item.name}
              </span>

              <div className="tree-options">
                <Options
                  fullObj={item}
                  mutate={mutate}
                  type={type}
                  loading={loading}
                  keyInPermission={"category"}
                  refetch={refetch}
                />
              </div>
            </div>

            {item.subcategories && item.subcategories.length > 0 && (
              <div className={active.includes(item.id) ? "d-block" : "d-none"}>
                <TreeLine
                  data={item.subcategories}
                  level={level + 1}
                  active={active}
                  setActive={setActive}
                  mutate={mutate}
                  type={type}
                  loading={loading}
                  refetch={refetch}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default TreeLine;
