import Image from 'next/image'


export default function SMS({className}: {className?: string}) {
    return (
        <Image src={'/send-sms.png'} alt='send-sms' className={className} width={16} height={16}  />
    );
}