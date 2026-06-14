import { SocialMediaItem } from '@/lib/types';
import Icon from './icons/socialMedias';
import { trackSocialClick } from '@/lib/analytics';

export default function SocialMediasListItem({
    title,
    href,
    component
}: SocialMediaItem) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block mx-2 hover:scale-110 transition duration-300 mt-2"
            title={title}
            onClick={() =>
                trackSocialClick({
                    title,
                    href,
                    component,
                })
            }
        >
            <Icon component={component} className="w-8 h-8 text-white" />
        </a>
    );
};
