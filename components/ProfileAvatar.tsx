import Image from 'next/image';
import classNames from 'classnames';

/** TQA brand ember — fills transparent areas on the profile cutout. */
const EMBER = '#D54A2F';

export default function ProfileAvatar({
    src,
    alt,
    size,
    className,
    priority = false,
}: {
    src: string;
    alt: string;
    size: number;
    className?: string;
    priority?: boolean;
}) {
    return (
        <div
            className={classNames('shrink-0 overflow-hidden rounded-full', className)}
            style={{ width: size, height: size, backgroundColor: EMBER }}
        >
            <Image
                className="h-full w-full object-cover"
                alt={alt}
                src={src}
                width={size}
                height={size}
                priority={priority}
            />
        </div>
    );
}
