import { RiCheckboxCircleLine, RiCloseCircleLine, RiTruckLine, RiInboxArchiveLine, RiFileList3Line } from 'react-icons/ri';

const TrackingPanel = ({ orderStatusData, orderStatus }) => {
    const getStatusIcon = (slug, isActive, isFailed) => {
        if (isFailed) return <RiCloseCircleLine />;
        switch (slug) {
            case 'pending': return <RiFileList3Line />;
            case 'packed': return <RiInboxArchiveLine />;
            case 'shipped': return <RiTruckLine />;
            case 'out-for-delivery': return <RiTruckLine />;
            case 'delivered': return <RiCheckboxCircleLine />;
            default: return <RiFileList3Line />;
        }
    }

    // Filter out statuses that shouldn't be in the main timeline if they are terminal/error
    const mainTimelineSteps = orderStatusData?.filter(elem => 
        !['cancelled', 'returned'].includes(elem.slug)
    ).sort((a, b) => a.sequence - b.sequence);

    const isFailed = ['cancelled', 'returned'].includes(orderStatus?.slug);

    return (
        <ul>
            {mainTimelineSteps?.map((elem, index) => {
                const isActive = elem?.sequence <= orderStatus?.sequence && !isFailed;
                const isCompleted = elem?.sequence < orderStatus?.sequence && !isFailed;
                
                return (
                    <li className={isActive ? "active" : ""} key={index}>
                        <div className="panel-content">
                            <div className="icon" style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '24px',
                                color: isActive ? 'var(--theme-color)' : '#adb5bd'
                            }}>
                                {getStatusIcon(elem.slug, isActive, false)}
                            </div>
                            <div className="status">
                                {elem?.name}
                            </div>
                        </div>
                    </li>
                );
            })}
            {isFailed && (
                <li className="active cancelled-box">
                    <div className="panel-content">
                        <div className="icon" style={{ 
                            display: 'flex', 
                            align-items: 'center', 
                            justify-content: 'center',
                            fontSize: '24px',
                            color: '#e22454'
                        }}>
                            {getStatusIcon(orderStatus.slug, true, true)}
                        </div>
                        <div className="status" style={{ color: '#e22454' }}>{orderStatus?.name}</div>
                    </div>
                </li>
            )}
        </ul>
    )
}

export default TrackingPanel