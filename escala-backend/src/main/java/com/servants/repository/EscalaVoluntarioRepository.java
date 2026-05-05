package com.servants.repository;

import com.servants.model.EscalaVoluntario;
import com.servants.model.Ministerio;
import com.servants.model.Voluntario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EscalaVoluntarioRepository extends JpaRepository<EscalaVoluntario, Long> {
    long countByVoluntarioAndMinisterio(Voluntario voluntario, Ministerio ministerio);
}
