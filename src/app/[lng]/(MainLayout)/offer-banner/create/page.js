'use client'
import OfferBannerForm from "@/Components/OfferBanner/OfferBannerForm";
import { offerBanner } from "@/Utils/AxiosUtils/API";
import FormWrapper from "@/Utils/HOC/FormWrapper";
import useCreate from "@/Utils/Hooks/useCreate";

const OfferBannerCreate = () => {
  const { mutate, isLoading } = useCreate(offerBanner, false, "/offer-banner");
  return (
    <FormWrapper title="AddOfferBanner">
      <OfferBannerForm loading={isLoading} mutate={mutate} />
    </FormWrapper>
  );
};

export default OfferBannerCreate;
