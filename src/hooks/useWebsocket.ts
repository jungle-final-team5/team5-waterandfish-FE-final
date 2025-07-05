import React, { useState, useEffect } from 'react';

const connectToWebSocket = (wsUrl: string) => {
    alert(`connecting to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    return ws;
};


const connectToWebSockets = (wsUrls: string[]) => {
    const wsList = [];
    for (const wsUrl of wsUrls) {
        const ws = new WebSocket(wsUrl);
        wsList.push(ws);
    }
    return wsList;
};

const useWebsocket = (wsUrls: string[]) => {
    const [wsList, setWsList] = useState<WebSocket[]>([]);


    useEffect(() => {
        const uniqueWsUrls = [...new Set(wsUrls)];
        alert(`connecting to ${uniqueWsUrls}`);
        const ws = connectToWebSockets(uniqueWsUrls);
        setWsList(ws);
    }, [wsUrls]);

    return { wsList };
};

export default useWebsocket;
export { connectToWebSocket };