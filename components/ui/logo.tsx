import Image from 'next/image'


export default function Logo({className}: {className?: string}) {
    return (
        <Image src={'/Logo.png'} alt='net-notify' className={className}      width={120}
        height={120}  />
    );
}