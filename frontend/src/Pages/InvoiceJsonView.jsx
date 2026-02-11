const { id } = useParams();

useEffect(() => {
  api.get(`/invoice/json/otm/${id}`).then(res => setInvoice(res.data));
}, []);
