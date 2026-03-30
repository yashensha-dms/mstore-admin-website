import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useCookies } from 'react-cookie';
import AccountContext from '.'
import request from '../../Utils/AxiosUtils';
import { selfData } from '../../Utils/AxiosUtils/API';

const AccountProvider = (props) => {
    const [cookies] = useCookies(["uat"]);
    const [role, setRole] = useState('')
    const { data, refetch, isLoading } = useQuery([selfData, cookies.uat], () => request({ url: selfData }), {
        enabled: false, select: (res) => { return res?.data },
        staleTime: 5 * 60 * 1000,  // 5 minutes — user account data rarely changes mid-session
        cacheTime: 10 * 60 * 1000,
    });
    const [accountData, setAccountData] = useState()
    const [accountContextData, setAccountContextData] = useState({
        name: "",
        image: {}
    })

    useEffect(() => {
        cookies.uat && refetch()
    }, [cookies.uat])

    useEffect(() => {
        if (data) {
            localStorage.setItem("role", JSON.stringify(data?.role))
            setRole(data?.role?.name)
        }
        setAccountData(data)
    }, [isLoading, cookies.uat])

    return (
        <AccountContext.Provider value={{ ...props, accountData, setAccountData, accountContextData, setAccountContextData, role, setRole }}>
            {props.children}
        </AccountContext.Provider>
    )
}
export default AccountProvider