import Image from "next/image";
import React from "react";

const Img = (props) => {
  const isAbsoluteUrl = props["src"]?.startsWith("http://") || props["src"]?.startsWith("https://");
  const newProps = { ...props, src: isAbsoluteUrl ? props["src"] : process.env.API_PROD_URL + "/" + props["src"] };
  return <Image {...newProps} unoptimized={true} />;
};


export default Img;
