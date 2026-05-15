import { useContext,useEffect } from "react";
import { Approved, product } from "../../Utils/AxiosUtils/API";
import TableWarper from "../../Utils/HOC/TableWarper";
import ShowTable from "../Table/ShowTable";
import Loader from "../CommonComponent/Loader";
import usePermissionCheck from "../../Utils/Hooks/usePermissionCheck";
import placeHolderImage from "../../../public/assets/images/placeholder.png";
import AccountContext from "../../Helper/AccountContext";
import SettingContext from "../../Helper/SettingContext";

const AllProductTable = ({ data, ...props }) => {
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);
  const { role, setRole } = useContext(AccountContext)
  const { settingObj } = useContext(SettingContext);
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole) {
      const parsedRole = JSON.parse(storedRole);
      setRole(parsedRole.name);
    }
  }, [])
  const headerObj = {
    checkBox: true,
    isOption: edit == false && destroy == false ? false : true,
    noEdit: edit ? false : true,
    optionHead: { title: "Action" },
    column: [
      { title: "Image", apiKey: "product_thumbnail", type: 'image', placeHolderImage: placeHolderImage },
      { title: "Name", apiKey: "name", sorting: true, sortBy: "desc" },
      { title: "Price", apiKey: "sale_price", sorting: true, sortBy: "desc", type: 'price' },
      { title: "Stock", apiKey: "stock_status", type: 'stock_status' },
      { title: "StockQuantity", apiKey: "quantity", sorting: true, sortBy: "desc" },
      { title: "Approved", apiKey: "is_approved", type: 'switch', url: `${product}${Approved}` },
      { title: "Status", apiKey: "status", type: 'switch' }
    ],
    data: data || []
  };
  headerObj.data.map((element) => element.sale_price = element?.sale_price)

  let pro = headerObj?.column?.filter((elem) => {
    return role == 'vendor' ? elem.title !== 'Approved' : elem;
  });
  headerObj.column = headerObj ? pro : [];
  if (!data || edit === undefined || !role || !settingObj?.general) return <Loader />;
  return <>
    <ShowTable {...props} headerData={headerObj} />
  </>
};

export default TableWarper(AllProductTable);
