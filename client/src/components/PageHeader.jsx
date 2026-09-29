export default function PageHeader({ title, description, children }) {
  return (
    <>
      <h2>{title}</h2>
      {description && <p className="sub">{description}</p>}
      {children}
    </>
  );
}
