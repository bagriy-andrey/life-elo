import { Avatar } from 'life-elo'

export const Initials = () => <Avatar name="Андрей Багрий" />

export const Photo = () => (
  <Avatar
    name="Андрей"
    src={'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#8a9"/><circle cx="48" cy="38" r="16" fill="#fff"/><rect x="20" y="60" width="56" height="30" rx="14" fill="#fff"/></svg>')}
  />
)

export const EditButton = () => <Avatar name="Андрей" onClick={() => {}} label="Выбрать фото" />

export const Small = () => <Avatar name="Анна" size={40} />
