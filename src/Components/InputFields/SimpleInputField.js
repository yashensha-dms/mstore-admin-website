import React from "react";
import InputField from "./InputField";

const SimpleInputField = React.memo(({ nameList }) => {
  return (
    <>
      {nameList.map(({ name, ...rest }, i) => (
        <InputField name={name} {...rest} key={i} />
      ))}
    </>
  );
});

export default SimpleInputField;
