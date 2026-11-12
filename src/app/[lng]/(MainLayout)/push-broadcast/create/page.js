'use client'
import PushBroadcastForm from "@/Components/PushBroadcast/PushBroadcastForm";
import { pushBroadcast } from "@/Utils/AxiosUtils/API";
import FormWrapper from "@/Utils/HOC/FormWrapper";
import useCreate from "@/Utils/Hooks/useCreate";

const PushBroadcastCreate = () => {
  const { mutate, isLoading } = useCreate(
    pushBroadcast,
    false,
    "/push-broadcast",
    "Notification sent successfully"
  );
  return (
    <FormWrapper title="AddPushBroadcast">
      <PushBroadcastForm loading={isLoading} mutate={mutate} />
    </FormWrapper>
  );
};

export default PushBroadcastCreate;
