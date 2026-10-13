import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useCookies } from 'react-cookie';
import AccountContext from '.'
import request from '../../Utils/AxiosUtils';
import { selfData } from '../../Utils/AxiosUtils/API';

const AccountProvider = (props) => {
    const [cookies, setCookie] = useCookies(["uat"]);
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
    // Active store for the "Switch Store" dropdown in ProfileNav.
    // Persisted so refresh / navigation keeps the switched store, and sent
    // as X-Store-Id on every API call (see Utils/AxiosUtils).
    const [activeStore, setActiveStoreState] = useState(() => {
        if (typeof window === "undefined") return null;
        try {
            const raw = localStorage.getItem("active_store");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    });

    const setActiveStore = (storeObj) => {
        setActiveStoreState(storeObj || null);
        try {
            if (storeObj?.id) {
                localStorage.setItem("active_store", JSON.stringify(storeObj));
                localStorage.setItem("active_store_id", String(storeObj.id));
                setCookie("active_store_id", String(storeObj.id), {
                    path: "/",
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                });
            } else {
                localStorage.removeItem("active_store");
                localStorage.removeItem("active_store_id");
                setCookie("active_store_id", "", { path: "/", expires: new Date(0) });
            }
        } catch (e) {}
    };

    const clearActiveStore = () => setActiveStore(null);

    useEffect(() => {
        cookies.uat && refetch()
    }, [cookies.uat])

    useEffect(() => {
        if (data) {
            localStorage.setItem("role", JSON.stringify(data?.role))
            setRole(data?.role?.name)
            // Sync with cookie for middleware optimization
            const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            setCookie("account", JSON.stringify(data), {
                path: "/",
                expires: tokenExpiry,
            });
        }
        setAccountData(data)
    }, [data, cookies.uat])

    return (
        <AccountContext.Provider value={{ ...props, accountData, setAccountData, accountContextData, setAccountContextData, role, setRole, activeStore, setActiveStore, clearActiveStore }}>
            {props.children}
        </AccountContext.Provider>
    )
}
export default AccountProvider