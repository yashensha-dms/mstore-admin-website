'use client'
import { useState } from "react";
import ProductForm from "@/Components/Product/ProductForm";
import { product } from "@/Utils/AxiosUtils/API";
import useUpdate from "@/Utils/Hooks/useUpdate";

const UpdateProduct = ({ params }) => {
  const [resetKey, setResetKey] = useState(false)
  const { mutate, isLoading } = useUpdate(product, params?.updateId, "/product", "Product Updated Successfully", () => {
    setResetKey(true)
  });

  return (
    params?.updateId && (
      <ProductForm mutate={mutate} updateId={params?.updateId} loading={isLoading} title={"EditProduct"} key={resetKey} />
    )
  );
};

export default UpdateProduct;
